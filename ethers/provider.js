import { ethers } from 'ethers';

const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const myRpc = `https://eth-mainnet.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)

const main = async () => {
    const blockNumber = await provider.getBlockNumber()
    console.log(blockNumber)

    // 查询某个地址的历史交易次数
    const txCount = await provider.getTransactionCount("0xf0aC9747345c23B6ba451d9103F8C2785800998D")
    console.log(txCount);

    // 查询交易明细
    const tx = await provider.getTransaction("0xf28ca0996f0f2a4ba352e3b83c70d5659246089feb7d177f43d993e8d956fe69")
    console.log(tx);
    
    // 当前建议的gas设置
    const feeData = await provider.getFeeData()
    console.log(feeData);

    const block = await provider.getBlock()
    console.log(block);


    // 查询某个合约地址的byteCode
    const code = await provider.getCode("0xE77730982C749C9678B22f371e1f64C7f572C2b9")
    console.log(code);


    
}

main()