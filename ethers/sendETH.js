/**
 * Signer签名类是以太坊账户的抽象，可以对消息和交易进行签名，并将签名的交易发送到以太坊网络，
 * 改变区块链状态，Signer是抽象类不能实例化，需要使用它的子类Wallet
 * 
 * 创建Wallet的几种方法
 * 1.创建随机的wallet对象
 * 2.使用私钥创建wallet对象
 * 3.使用助记词创建wallet对象
 * 4.使用keystore文件创建wallet对象
 * 
 * 
 * 
 * 
 * 
 * 
 */
import { ethers } from 'ethers'

const randomWallet = ethers.Wallet.createRandom()
console.log('randomWallet', randomWallet.address);

const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const wallet = new ethers.Wallet(privateKey)
console.log('privateKey', wallet);

const phrase = ethers.Wallet.fromPhrase(`cram solid pelican tiny kidney round toy clarify copper hold release pond`)
console.log('phrase', phrase);


const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)
const connectedPhrase = phrase.connect(provider)

const transaction = await connectedPhrase.sendTransaction({
    to: '0x36b7a8aa8Bf98DD8aCc2be4432B6B61bEECf615b',
    value: ethers.parseEther('0.001')
})
const recipt = await transaction.wait();
console.log('recipt', recipt);