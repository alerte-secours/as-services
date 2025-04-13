const { generateKeyPair } = require("jose")

async function generateEd25519KeyPair() {
  try {
    const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
      crv: "Ed25519",
    })

    const publicKeyJwk = await publicKey.export({ format: "jwk" })
    const privateKeyJwk = await privateKey.export({ format: "jwk" })

    return { publicKeyJwk, privateKeyJwk }
  } catch (error) {
    console.error("Error generating key pair:", error)
  }
}

generateEd25519KeyPair().then(({ publicKeyJwk, privateKeyJwk }) => {
  console.log("Public Key:", publicKeyJwk)
  console.log("Private Key:", privateKeyJwk)
})
