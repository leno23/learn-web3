import { ethers } from 'ethers';
const myTestRpc = `https://eth-mainnet.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)

const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const contractABI = [
    "event Transfer(address indexed from, address indexed to, uint256 amount)"
]
const contractUSDT = new ethers.Contract(contractAddress, contractABI, provider)

// 只监听一次
console.log("\n1. 利用contract.once()，监听一次Transfer事件");
// contractUSDT.once('Transfer', (from, to, value) => {
// 持续监听
contractUSDT.on('Transfer', (from, to, value) => {
    // 打印结果
    console.log(    
        `${from} -> ${to} ${ethers.formatUnits(ethers.getBigInt(value), 6)}`
    )
})