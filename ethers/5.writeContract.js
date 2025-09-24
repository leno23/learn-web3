import { ethers } from 'ethers';
const myTestRpc = `https://eth-sepolia.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV`
const provider = new ethers.JsonRpcProvider(myTestRpc)


// 根据私钥创建钱包
const privateKey = '0xee46391a7be1cb5e3e97ae095fcff049513b9269ba1da52e308e5d7e19298087'
const wallet = new ethers.Wallet(privateKey, provider)

// WETH的ABI
const abiWETH = [
    "function balanceOf(address) public view returns(uint)",
    "function deposit() public payable",
    "function transfer(address, uint) public returns (bool)",
    "function withdraw(uint) public",
];
// WETH合约地址（sepolia测试网）
const addressWETH = '0x7b79995e5f793a07bc00c21412e50ecae098e7f9'
// WETH Contract

// 声明可写合约
const contractWETH = new ethers.Contract(addressWETH, abiWETH, wallet)


const main = async () => {
    // 获取钱包地址
    const address = await wallet.getAddress()
    console.log(address)

    // 获取WETH余额
    let balance = await contractWETH.balanceOf(address)
    console.log(balance)
    console.log(`存款前WETH余额：${ethers.formatEther(balance)}`)

    // 存款
    const tx = await contractWETH.deposit({ value: ethers.parseEther('0.001') })
    const recipt = await tx.wait()
    console.log(recipt)

    // 获取WETH余额
    balance = await contractWETH.balanceOf(address)
    console.log(balance)
    console.log(`存款后WETH余额：${ethers.formatEther(balance)}`)
}

main()