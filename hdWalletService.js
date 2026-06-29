/**
 * hdWalletService.js
 * ─────────────────────────────────────────────────────────────
 * Generates deterministic per-user deposit addresses from a
 * single master seed (HD wallet — BIP32/BIP44).
 *
 * Each user gets a unique index stored in DB → same seed always
 * produces the same address for that user.
 *
 * Supported chains:
 *   EVM  → ETH, BNB, ONE, + USDT(ERC20/BEP20)
 *   UTXO → BTC, LTC, DOGE, DASH, DGB, ZEC
 *   TRX  → TRX, WIN, USDT(TRC20)
 *   XRP  → XRP
 *   SOL  → SOL
 *   ALGO → ALGO
 *   Save to DB (private key NEVER stored)
 * ENV required:
 *   HD_MASTER_SEED  — 64-hex-char random secret (generate once, never change)
 */

const { ethers } = require('ethers');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const bip39 = require('bip39');
const { Keypair } = require('@solana/web3.js');
const algosdk = require('algosdk');
const { query } = require('../config/database');
const logger = require('../config/logger');

const bip32 = BIP32Factory(ecc);

const getMasterNode = () => {
  const hex = process.env.HD_MASTER_SEED;
  if (!hex || hex.length < 64) {
    throw new Error('HD_MASTER_SEED missing or too short in .env (need 64+ hex chars)');
  }
  const seed = Buffer.from(hex, 'hex');
  return bip32.fromSeed(seed);
};

const COIN_TYPE = {
  BTC: 0,
  LTC: 2,
  DOGE: 3,
  DASH: 5,
  ZEC: 133,
  ETH: 60,
  BNB: 60,
  ONE: 60,
  USDT: 60,
  TRX: 195,
  WIN: 195,
  XRP: 144,
  SOL: 501,
  ALGO: 283,
  ADA: 1815,
  DGB: 20,
};

const UTXO_NETWORKS = {
  BTC: bitcoin.networks.bitcoin,
  LTC: { messagePrefix: '\x19Litecoin Signed Message:\n', bech32: 'ltc', bip32: { public: 0x019da462, private: 0x019d9cfe }, pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 },
  DOGE: { messagePrefix: '\x19Dogecoin Signed Message:\n', bech32: '', bip32: { public: 0x02facafd, private: 0x02fac398 }, pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e },
  DASH: { messagePrefix: '\x19DarkCoin Signed Message:\n', bech32: '', bip32: { public: 0x0488b21e, private: 0x0488ade4 }, pubKeyHash: 0x4c, scriptHash: 0x10, wif: 0xcc },
  ZEC: { messagePrefix: '\x19Zcash Signed Message:\n', bech32: '', bip32: { public: 0x0488b21e, private: 0x0488ade4 }, pubKeyHash: 0x1cb8, scriptHash: 0x1cbd, wif: 0x80 },
  DGB: { messagePrefix: '\x19DigiByte Signed Message:\n', bech32: 'dgb', bip32: { public: 0x0488b21e, private: 0x0488ade4 }, pubKeyHash: 0x1e, scriptHash: 0x3f, wif: 0x80 },
};

const deriveEVM = (userIndex, accountIndex = 0) => {
  const master = getMasterNode();
  const path = `m/44'/60'/${accountIndex}'/0/${userIndex}`;
  const child = master.derivePath(path);
  const wallet = new ethers.Wallet(child.privateKey.toString('hex'));
  return { address: wallet.address, privateKey: child.privateKey.toString('hex') };
};

const deriveUTXO = (coin, userIndex) => {
  const network = UTXO_NETWORKS[coin];
  const coinType = COIN_TYPE[coin];
  const master = getMasterNode();
  const path = `m/44'/${coinType}'/0'/0/${userIndex}`;
  const child = master.derivePath(path);
  const { address } = bitcoin.payments.p2pkh({
    pubkey: child.publicKey,
    network: network,
  });
  return { address, privateKey: child.privateKey.toString('hex') };
};

const deriveTRON = (userIndex) => {
  const master = getMasterNode();
  const path = `m/44'/195'/0'/0/${userIndex}`;
  const child = master.derivePath(path);
  const privHex = child.privateKey.toString('hex');

  const pubKey = ecc.pointFromScalar(child.privateKey, false);
  const pubKeyHash = require('crypto')
    .createHash('sha256').update(pubKey.slice(1))
    .digest();
  const keccak = ethers.keccak256(pubKey.slice(1));
  const ethAddr = '0x' + keccak.slice(-40);
  const addrHex = '41' + ethAddr.slice(2);
  const addrBytes = Buffer.from(addrHex, 'hex');
  const hash1 = require('crypto').createHash('sha256').update(addrBytes).digest();
  const hash2 = require('crypto').createHash('sha256').update(hash1).digest();
  const checksum = hash2.slice(0, 4);
  const final = Buffer.concat([addrBytes, checksum]);
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  let num = BigInt('0x' + final.toString('hex'));
  let addr = '';
  while (num > 0n) {
    addr = base58chars[Number(num % 58n)] + addr;
    num = num / 58n;
  }
  for (const byte of final) {
    if (byte === 0) addr = '1' + addr;
    else break;
  }

  return { address: addr, privateKey: privHex };
};

const deriveXRP = (userIndex) => {
  const master = getMasterNode();
  const path = `m/44'/144'/0'/0/${userIndex}`;
  const child = master.derivePath(path);
  const privHex = child.privateKey.toString('hex');

  const xrpAlpha = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  const pubKey = child.publicKey;
  const sha256 = require('crypto').createHash('sha256').update(pubKey).digest();
  const ripemd160 = require('crypto').createHash('ripemd160').update(sha256).digest();
  const payload = Buffer.concat([Buffer.from([0x00]), ripemd160]);
  const h1 = require('crypto').createHash('sha256').update(payload).digest();
  const h2 = require('crypto').createHash('sha256').update(h1).digest();
  const full = Buffer.concat([payload, h2.slice(0, 4)]);

  let num = BigInt('0x' + full.toString('hex'));
  let addr = '';
  while (num > 0n) {
    addr = xrpAlpha[Number(num % 58n)] + addr;
    num = num / 58n;
  }
  for (const byte of full) {
    if (byte === 0) addr = xrpAlpha[0] + addr;
    else break;
  }

  return { address: addr, privateKey: privHex };
};

const deriveSOL = (userIndex) => {
  const master = getMasterNode();
  const path = `m/44'/501'/${userIndex}'/0'`;
  const child = master.derivePath(path);
  const keypair = Keypair.fromSeed(child.privateKey);
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
};

const deriveALGO = (userIndex) => {
  const master = getMasterNode();
  const path = `m/44'/283'/${userIndex}'/0'/0'`;
  const child = master.derivePath(path);
  const account = algosdk.mnemonicToSecretKey(
    algosdk.secretKeyToMnemonic(child.privateKey)
  );
  return { address: account.addr, privateKey: Buffer.from(account.sk).toString('hex') };
};

const getOrCreateAddress = async (userId, coin, network) => {
  const [existing] = await query(
    'SELECT address, memo FROM deposit_addresses WHERE user_id = ? AND coin = ? AND network = ? AND is_active = 1',
    [userId, coin, network]
  );
  if (existing) return { address: existing.address, memo: existing.memo };

  let [userRow] = await query('SELECT hd_index FROM users WHERE id = ?', [userId]);
  let hdIndex = userRow?.hd_index;

  if (!hdIndex) {
    const [{ maxIdx }] = await query('SELECT COALESCE(MAX(hd_index), 0) AS maxIdx FROM users');
    hdIndex = maxIdx + 1;
    await query('UPDATE users SET hd_index = ? WHERE id = ?', [hdIndex, userId]);
  }

  const coinUp = coin.toUpperCase();
  const netLow = network.toLowerCase();
  let result;

  if (['eth', 'erc20'].includes(netLow) || coinUp === 'ETH') {
    result = deriveEVM(hdIndex, 0);
  } else if (['bsc', 'bep20'].includes(netLow) || coinUp === 'BNB') {
    result = deriveEVM(hdIndex, 1);
  } else if (netLow === 'one' || coinUp === 'ONE') {
    result = deriveEVM(hdIndex, 2);
  } else if (['trx', 'trc20'].includes(netLow) || ['TRX', 'WIN'].includes(coinUp)) {
    result = deriveTRON(hdIndex);
  } else if (netLow === 'btc' || coinUp === 'BTC') result = deriveUTXO('BTC', hdIndex);
  else if (netLow === 'ltc' || coinUp === 'LTC') result = deriveUTXO('LTC', hdIndex);
  else if (netLow === 'doge' || coinUp === 'DOGE') result = deriveUTXO('DOGE', hdIndex);
  else if (netLow === 'dash' || coinUp === 'DASH') result = deriveUTXO('DASH', hdIndex);
  else if (netLow === 'zec' || coinUp === 'ZEC') result = deriveUTXO('ZEC', hdIndex);
  else if (netLow === 'dgb' || coinUp === 'DGB') result = deriveUTXO('DGB', hdIndex);
  else if (netLow === 'xrp' || coinUp === 'XRP') result = deriveXRP(hdIndex);
  else if (netLow === 'sol' || coinUp === 'SOL') result = deriveSOL(hdIndex);
  else if (netLow === 'algo' || coinUp === 'ALGO') result = deriveALGO(hdIndex);
  else throw new Error(`Unsupported coin/network: ${coin}/${network}`);

  const { v4: uuidv4 } = require('uuid');
  await query(
    `INSERT INTO deposit_addresses (id, user_id, coin, network, address, memo)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE address = VALUES(address)`,
    [uuidv4(), userId, coinUp, netLow, result.address, null]
  );

  logger.info(`[hdWallet] New address for user=${userId} coin=${coinUp} net=${netLow} → ${result.address}`);
  return { address: result.address, memo: null };
};

module.exports = { getOrCreateAddress, deriveEVM, deriveUTXO, deriveTRON, deriveXRP, deriveSOL, deriveALGO };
