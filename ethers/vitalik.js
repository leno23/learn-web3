import { ethers } from 'ethers';



const ALCHEMY_MAINNET_URL = 'https://rpc.ankr.com/eth';
const ALCHEMY_SEPOLIA_URL = 'https://rpc.sepolia.org';


// 方法1：使用你自己的 Alchemy API 密钥
// 在ethers中，Provider是为以太坊网络提供链接的抽象的类，它提供了区块链及其状态的只读访问。
// 申请自己的rpc,连接到特定节点服务商的节点

// 也可以在chainlist 找公开的节点连接
const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const myRpc = `https://eth-mainnet.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myRpc)

// 方法2：或者继续使用默认 provider（但会有频率限制）
// const provider = new ethers.getDefaultProvider()

const main = async () => {
    // 查询 vitalik.eth 的余额
    // ENS域名是以太坊名称服务。  vitalik.eth   --> 0xxxxxxxx
    const balance = await provider.getBalance('0xf0aC9747345c23B6ba451d9103F8C2785800998D')
    // balance单位是wei，1ETH = 10^18wei   formatEther() 将wei转换为ETH
    console.log(ethers.formatEther(balance)+' ETH')

    const network = await provider.getNetwork()
    console.log(network.toJSON())
}

main()

