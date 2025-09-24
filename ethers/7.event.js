// 智能合约释放出来的日志存储在以太坊虚拟机的日志中，日志分为两个部分，主题topics和数据data，
// 其中时间哈希和indexed变量存储在topics中，作为索引方便以后搜索，没有indexed变量存储在data中，
// 不能被索引，但是可以存储更复杂的数据结构 

// 以ERC20代币中的Transfer转账事件为例，在合约中他是这样的声明的
// event Transfer(address indexed from, address indexed to, uint256 amount)

// 它记录了三个变量，from代币的发送地址，to代币的接收地址，amount转账数量

// 检索事件
import { ethers } from 'ethers';
const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)

const contractAddress = '0x7b79995e5f793a07bc00c21412e50ecae098e7f9'
const contractABI = [
    "event Transfer(address indexed from, address indexed to, uint256 amount)"
]
const contract = new ethers.Contract(contractAddress, contractABI, provider)

// 得到当前block
const block = await provider.getBlockNumber()
console.log(`当前区块高度: ${block}`);
console.log(`打印事件详情:`);
const transferEvents = await contract.queryFilter('Transfer', block - 5, block)
// 打印第1个Transfer事件
// console.log(transferEvents[0])

// 解析Transfer事件的数据（变量在args中）
console.log("\n2. 解析事件：")
const amount = ethers.formatUnits(ethers.getBigInt(transferEvents[0].args["amount"]), "ether");
console.log(`地址 ${transferEvents[0].args["from"]} 转账${amount} WETH 到地址 ${transferEvents[0].args["to"]}`)