import { ethers } from 'ethers';
import abi from './abi.js';
const contractAddress = "0xE77730982C749C9678B22f371e1f64C7f572C2b9"
// abi  Application Binary Interface 应用二进制接口，用于和智能合约交互
const contractABI = abi
const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)
// contract对象分两类
// 可读   只能读取链上合约的信息，执行call操作，执行view pure方法，而不能执行transaction
// 可读写  在可读contract合约功能基础上，还能执行交易

// 创建只读合约的两种方法
// 1.直接输入合约abi  在本地编译artifact中json文件中，或者在etherscan页面找到
const readContract = new ethers.Contract(contractAddress, contractABI, provider)


// 1.由于abi可读性太差，ethers引入了第二种Human-Readable ABI，可以使用function signature和event signature写abi
// 用这个方法创建稳定币DAI的合约实例
const abiERC20 = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function balanceOf(address) view returns (uint256)',
]
const contractERC20 = new ethers.Contract(contractAddress, abiERC20, provider)


const main = async () => {
    const balance = await readContract.balanceOf("0xf0aC9747345c23B6ba451d9103F8C2785800998D")
    console.log(balance);
    const name = await readContract.name()
    console.log(name);

    const symbol = await readContract.symbol()
    console.log(symbol);

    const nameERC20 = await contractERC20.name()
    console.log('nameERC20', nameERC20);

    const symbolERC20 = await contractERC20.symbol()
    console.log('symbolERC20', symbolERC20);
}

main()