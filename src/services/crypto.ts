/**
 * Encryption Service for RecoveryLM
 *
 * Implements AES-GCM-256 encryption with PBKDF2 key derivation.
 * All user data is encrypted locally before storage.
 */

const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

export interface EncryptedPayload {
  iv: string // Base64
  ciphertext: string // Base64
  salt: string // Base64
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Generate a random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as a key for PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string using AES-GCM-256
 */
export async function encrypt(data: string, key: CryptoKey, salt: Uint8Array): Promise<EncryptedPayload> {
  const iv = generateIV()
  const encodedData = new TextEncoder().encode(data)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
    salt: bufferToBase64(salt)
  }
}

/**
 * Decrypt an encrypted payload using AES-GCM-256
 */
export async function decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = new Uint8Array(base64ToBuffer(payload.iv))
  const ciphertext = base64ToBuffer(payload.ciphertext)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt an object by serializing to JSON first
 */
export async function encryptObject<T>(data: T, key: CryptoKey, salt: Uint8Array): Promise<EncryptedPayload> {
  const jsonString = JSON.stringify(data)
  return encrypt(jsonString, key, salt)
}

/**
 * Decrypt an encrypted payload to an object
 */
export async function decryptObject<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const jsonString = await decrypt(payload, key)
  return JSON.parse(jsonString) as T
}

// ============================================
// Recovery Phrase (BIP39-like mnemonic)
// ============================================

// Simplified word list (in production, use full BIP39 list)
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acquire', 'across', 'act', 'action', 'actor', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again',
  'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm',
  'album', 'alcohol', 'alert', 'alien', 'allow', 'almost', 'alone', 'alpha',
  'already', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'anchor',
  'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual',
  'answer', 'antenna', 'antique', 'anxiety', 'apart', 'apology', 'appear', 'apple',
  'approve', 'april', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed',
  'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'artist',
  'artwork', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete',
  'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august',
  'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor',
  'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana',
  'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket',
  'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before',
  'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
  'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike',
  'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame',
  'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse',
  'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb',
  'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
  'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass',
  'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring',
  'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush',
  'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet',
  'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
  'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage',
  'cake', 'call', 'calm', 'camera', 'camp', 'canal', 'cancel', 'candy',
  'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'carbon'
]

/**
 * Generate a 12-word recovery phrase
 */
export function generateRecoveryPhrase(): string[] {
  const phrase: string[] = []
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))

  for (let i = 0; i < 12; i++) {
    // Use random bytes to select words
    const index = ((randomBytes[i % 16] + (randomBytes[(i + 1) % 16] << 8)) % WORD_LIST.length)
    phrase.push(WORD_LIST[index])
  }

  return phrase
}

/**
 * Derive a key from a recovery phrase
 */
export async function keyFromRecoveryPhrase(phrase: string[]): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  // Use the phrase joined as the password
  const password = phrase.join(' ')

  // Generate a deterministic salt from the phrase
  const encoder = new TextEncoder()
  const phraseBytes = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', phraseBytes)
  const salt = new Uint8Array(hashBuffer.slice(0, SALT_LENGTH))

  const key = await deriveKey(password, salt)
  return { key, salt }
}

/**
 * Validate that a recovery phrase has the correct format
 */
export function validateRecoveryPhrase(phrase: string[]): boolean {
  if (phrase.length !== 12) return false
  return phrase.every(word => WORD_LIST.includes(word.toLowerCase()))
}

// ============================================
// Key Management
// ============================================

let currentKey: CryptoKey | null = null
let currentSalt: Uint8Array | null = null

/**
 * Set the current encryption key (after successful unlock)
 */
export function setCurrentKey(key: CryptoKey, salt: Uint8Array): void {
  currentKey = key
  currentSalt = salt
}

/**
 * Clear the current encryption key (on lock)
 */
export function clearCurrentKey(): void {
  currentKey = null
  currentSalt = null
}

/**
 * Get the current encryption key
 */
export function getCurrentKey(): { key: CryptoKey; salt: Uint8Array } | null {
  if (!currentKey || !currentSalt) return null
  return { key: currentKey, salt: currentSalt }
}

/**
 * Check if the vault is currently unlocked
 */
export function isVaultUnlocked(): boolean {
  return currentKey !== null
}
