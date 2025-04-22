// Modular Lattice Encryption System
import sha256 from 'crypto-js/sha256';
import { axiosInstance } from "../lib/axios";

const Q = 104729; // A large prime number (can be shared across users)

export class CryptoUtils {
static async ensureOwnKeyPair() {
    try {
      const res = await axiosInstance.get(`key/user/private-key`);
      if (!res.data.privateKey) {
        console.log("no key pair generating new one")
        const lwe = new LWECryptosystem();
        const keyPair = lwe.keyGeneration();

        const publicKeyStr = JSON.stringify(keyPair.publicKey);
        const privateKeyStr = JSON.stringify(keyPair.secretKey);
        console.log(publicKeyStr, privateKeyStr)
        await CryptoUtils.postNewKeyPair({publicKey: publicKeyStr, privateKey: privateKeyStr });
        return keyPair;
      }
    return res.data;
        } catch (error) {
          const lwe = new LWECryptosystem();
          const keyPair = lwe.keyGeneration();
          await CryptoUtils.postNewKeyPair({ keyPair });
          return keyPair;
        }
      }
    
  static async postNewKeyPair(publicKey, privateKey) {
    await axiosInstance.put('key/user/keys', publicKey, privateKey);
  }

  static async postNewContact(userId,pubKey) {
    await axiosInstance.put(`key/contact/${userId}/public-key`, {publicKey: pubKey});
  }
    
  static async updateEvolution(userId,evolutionCount) {
    await axiosInstance.put(`key/contact/${userId}/evolution`, {evolutioncount: evolutionCount});
  }


  static getSpaceMap(text) {
    const map = [];
    [...text].forEach((ch, i) => {
      if (ch === ' ') map.push(i);
    });
    return map;
  }

  static removeSpaces(text) {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  static textToBinary(text) {
    return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }

  static segmentBinary(binary, blockSize = 4) {
    const blocks = [];
    for (let i = 0; i < binary.length; i += blockSize) {
      blocks.push(binary.slice(i, i + blockSize).padEnd(blockSize, '0'));
    }
    return blocks;
  }

  static async getReceiverKeys(userId) {
    const [pubKey, contactKey] = await Promise.all([
      (await axiosInstance.get(`key/user/receiver-public-key/${userId}`)).data.receiverPublicKey,
      (await axiosInstance.get(`key/contact/${userId}/public-key`)).data
    ]);
    console.log(pubKey, contactKey);
    return { pubKey, contactKey};
  }

  static evolveKey(key, times) {
    let evolved = key;
    for (let i = 0; i < times; i++) {
      evolved = sha256(evolved).toString();
      console.log("key evolved")
    }
    return evolved;
    
  }

  static binaryFromHex(hex) {
    return hex.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
  }

  static xorBlocks(blocks, xorKey) {
    return blocks.map((block, i) => {
      const keyBlock = xorKey.slice(i * 4, i * 4 + 4);
      return block.split('').map((bit, j) => (bit ^ keyBlock[j]).toString()).join('');
    });
  }

  

  static transposition(blocks) {
    return blocks.map((block, index) => {
      switch (index % 3) {
        case 0: return block.split('').reverse().join('');
        case 1: return block.slice(-1) + block.slice(0, -1);
        default: return block.split('').map((bit, i) => i % 2 === 0 ? bit : bit === '0' ? '1' : '0').join('');
      }
    });
  }

  static reverseTransposition(blocks) {
    return blocks.map((block, index) => {
      switch (index % 3) {
        case 0: return block.split('').reverse().join('');
        case 1: return block.slice(1) + block[0];
        default: return block.split('').map((bit, i) => i % 2 === 0 ? bit : bit === '0' ? '1' : '0').join('');
      }
    });
  }

  static substituteBlocks(blocks, table) {
    return blocks.map(block => table[block] || block);
  }

  static reverseSubstitutionTable(table) {
    const reversed = {};
    Object.entries(table).forEach(([k, v]) => reversed[v] = k);
    return reversed;
  }

  static generateSubstitutionTable() {
    const table = {};
    for (let i = 0; i < 16; i++) {
      const key = i.toString(2).padStart(4, '0');
      const val = (15 - i).toString(2).padStart(4, '0');
      table[key] = val;
    }
    return table;
  }

  static encryptSpaceMap(map, xorKey) {
    return map.map(pos => pos ^ parseInt(xorKey.slice(0, 8), 2));
  }

  static decryptSpaceMap(encryptedMap, xorKey) {
    return encryptedMap.map(pos => pos ^ parseInt(xorKey.slice(0, 8), 2));
  }

  static binaryToText(binaryString) {
    return binaryString.match(/.{8}/g).map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
  }

  static reinsertSpaces(text, spaceMap) {
    let chars = text.split('');
    spaceMap.forEach(pos => chars.splice(pos, 0, ' '));
    return chars.join('');
  }
}

export class LWECryptosystem {
  constructor(n = 8, q = Q) {
    this.n = n;
    this.q = q;
    this.A = null;
    this.S = null;
    this.B = null;
  }

  generateRandomVector(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * this.q));
  }

  keyGeneration() {
    this.A = this.generateRandomVector(this.n);
    this.S = this.generateRandomVector(this.n);
    this.B = this.A.map((val, i) => (val * this.S[i]) % this.q);
    return { publicKey: this.B, secretKey: this.S };
  }

  decryptBlock(ciphertext, publicKey) {
    console.log("cipher text", ciphertext)
    const M = ciphertext - publicKey[0]  % this.q;  // Adding this.q ensures positive result
    return M.toString(2).padStart(4, '0');
  }
  encryptBlock(block, publicKey) {
    const M = parseInt(block, 2) % this.q;
    console.log("Encrypting block:", block, "→", M);
  console.log("Using publicKey[0]:", publicKey[0]);
  console.log("Q:", this.q);
  
    return (publicKey[0] + M) % this.q;
  }
}

export async function performFullEncryptionFlow(inputText, userId) {
  const spaceMap = CryptoUtils.getSpaceMap(inputText);
  const clean = CryptoUtils.removeSpaces(inputText);
  const binary = CryptoUtils.textToBinary(clean);
  console.log("binary is ", binary)
  const segmented = CryptoUtils.segmentBinary(binary);
  console.log("segmented is ", segmented)

  const { pubKey, contactKey } = await CryptoUtils.getReceiverKeys(userId);
  if(contactKey.publicKey === undefined){
   await CryptoUtils.postNewContact(userId,pubKey);
   console.log("hi")
  }
  const pubKeystr = JSON.parse(pubKey)
  console.log("pubkey for e xorkey is ", pubKeystr)
  const evolvedHash = CryptoUtils.evolveKey(pubKeystr, contactKey.evolutioncount + 1);
  const xorKey = CryptoUtils.binaryFromHex(evolvedHash);
  console.log("XOR key is ", xorKey)
  const xored = CryptoUtils.xorBlocks(segmented, xorKey);
  console.log("xored is ", xored)
  const transposed = CryptoUtils.transposition(xored);
  console.log("transposed is",transposed)
  const table = CryptoUtils.generateSubstitutionTable();
  const substituted = CryptoUtils.substituteBlocks(transposed, table);
  console.log("substd",substituted);
  const lwe = new LWECryptosystem();
  const newKeyPair = lwe.keyGeneration();
  const publicKeyStr = JSON.stringify(newKeyPair.publicKey);
  const privateKeyStr = JSON.stringify(newKeyPair.secretKey);
  console.log(publicKeyStr, privateKeyStr);
  const pubKey1 = JSON.parse(pubKey);
  console.log("Substituted blocks:", substituted);
  console.log("PubKey for encryption:", pubKey);
  const encrypted = substituted.map(block => lwe.encryptBlock(block, pubKey1));
  const encryptedSpaceMap = CryptoUtils.encryptSpaceMap(spaceMap, xorKey);
  await CryptoUtils.postNewKeyPair({publicKey: publicKeyStr, privateKey: privateKeyStr});
  console.log("this is pub key: " ,pubKey)
  console.log(encrypted)
  console.log(encryptedSpaceMap)
  console.log(contactKey.evolutionCount)
  const evolutionCountNext = contactKey.evolutioncount +1;
  console.log("evo next" , evolutionCountNext)
  console.log("pubkey",pubKey)
  console.log("cotkey", contactKey.publicKey)
  if (JSON.stringify(pubKey) === JSON.stringify(contactKey.publicKey)) {
    await CryptoUtils.updateEvolution(userId, evolutionCountNext);
} else {
    await CryptoUtils.updateEvolution(userId, 0);
}



  return {
    encryptedText: encrypted,
    encryptedSpaceMap,
    pubKey,
    evolutionCountNext
  };
}

export async function performFullDecryptionFlow(data) {
  const encryptedText = data.encryptedText;
  const encryptedSpaceMap = data.encryptedSpaceMap;
  const publicKey = data.publicKey;
  const evolutionCount = data.evolutionCount;
  console.log("To decrypt text ", encryptedText)
  console.log("To decrypt map", encryptedSpaceMap)
  console.log("To decrypt key for xor is", publicKey)
  console.log("To decrypt evo", evolutionCount)
  const evolvedHash = CryptoUtils.evolveKey(publicKey, evolutionCount );
  const xorKey = CryptoUtils.binaryFromHex(evolvedHash);
  console.log("d xor is ", xorKey)

  const lwe = new LWECryptosystem();

  const decryptedBlocks = encryptedText.map(block =>
    lwe.decryptBlock(block, publicKey)
  );
  console.log("decryptec", decryptedBlocks)

  const reverseTable = CryptoUtils.reverseSubstitutionTable(CryptoUtils.generateSubstitutionTable());
  const unsubstituted = CryptoUtils.substituteBlocks(decryptedBlocks, reverseTable);
  console.log("unsubstituted is", unsubstituted)
  const untransposed = CryptoUtils.reverseTransposition(unsubstituted);
  console.log("reverse transpose is", untransposed)
  const unxored = CryptoUtils.xorBlocks(untransposed, xorKey);
  console.log("unxored is ", unxored)

  const binary = unxored.join('');
  console.log ("unsegmented is ", binary)
  const text = CryptoUtils.binaryToText(binary);

  const spaceMap = CryptoUtils.decryptSpaceMap(encryptedSpaceMap, xorKey);
  const finalText = CryptoUtils.reinsertSpaces(text, spaceMap);
  console.log(finalText)

  return finalText;
}
