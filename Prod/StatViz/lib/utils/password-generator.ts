// Password generation utility

const CHAR_SET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars: l, I, 1, 0, O

/**
 * Generate a random password
 * @param length Password length (default: 8)
 * @returns Random password string
 */
export function generatePassword(length: number = 8): string {
  let password = ''
  const charsetLength = CHAR_SET.length

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength)
    password += CHAR_SET[randomIndex]
  }

  return password
}
