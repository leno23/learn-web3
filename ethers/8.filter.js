import { ethers } from 'ethers';
const myTestRpc = `https://eth-mainnet.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)

// USDT合约地址
const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'

// 币安交易所地址
const accountBinance = `0x28C6c06298d514Db089934071355E5743bf21d60`

const contractABI = [
    "event Transfer(address indexed from, address indexed to, uint256 amount)",
    "function balanceOf(address) public view returns(uint)",
]
const contractUSDT = new ethers.Contract(contractAddress, contractABI, provider)

// 币安交易所USDT余额
const balanceUSDT = await contractUSDT.balanceOf(accountBinance)
console.log(`USDT余额: ${ethers.formatUnits(balanceUSDT, 6)}\n`)

// 过滤所有从myAddress到otherAddress的转账事件
// contract.filters.Transfer(myAddress, otherAddress)
// 过滤所有 转到myAddress或者从otherAddress 转账事件
// contract.filters.Transfer(null, [myAddress, otherAddress])


// 2. 创建过滤器，监听转移USDT进交易所
console.log("\n2. 创建过滤器，监听USDT转进交易所")
let filterBinanceIn = contractUSDT.filters.Transfer(null, accountBinance);
console.log("过滤器详情：")
console.log(filterBinanceIn);
contractUSDT.on(filterBinanceIn, (res) => {
    console.log('---------监听USDT进入交易所--------');
    console.log(
        `${res.args[0]} -> ${res.args[1]} ${ethers.formatUnits(res.args[2], 6)}`
    )
})

// 3. 创建过滤器，监听交易所转出USDT
let filterToBinanceOut = contractUSDT.filters.Transfer(accountBinance);
console.log("\n3. 创建过滤器，监听USDT转出交易所")
console.log("过滤器详情：")
console.log(filterToBinanceOut);
contractUSDT.on(filterToBinanceOut, (res) => {
    console.log('---------监听USDT转出交易所--------');
    console.log(
        `${res.args[0]} -> ${res.args[1]} ${ethers.formatUnits(res.args[2], 6)}`
    )
}
);