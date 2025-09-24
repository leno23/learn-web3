/*
这一讲，我们介绍合约类的 staticCall 方法，在发送交易之前检查交易是否会失败，节省大量 gas。

staticCall 方法是属于 ethers.Contract 类的编写方法分析，同类的还有 populateTransaction
 和 estimateGas 方法。

可能失败的交易
在以太坊上发交易需要付昂贵的 gas，并且有失败的风险，发送失败的交易并不会把 gas 返还给你。
因此，在发送交易前知道哪些交易可能会失败非常重要。如果你用过 metamask 小狐狸钱包，
那对下图不会陌生。

如果你的交易将失败，小狐狸会告诉你 this transaction may fail，翻译过来就是“这笔交易可能失败”。
当用户看到这个红字提示，就知道要取消这笔交易了，除非他想尝尝失败的滋味。

它是怎么做到的呢？这是因为以太坊节点有一个 eth_call 方法，让用户可以模拟一笔交易，并返回可能的
交易结果，但不真正在区块链上执行它（交易不上链）。

staticCall
在 ethers.js 中，你可以使用 contract.函数名.staticCall() 方法来模拟执行一个可能会改变状态
的函数，但不实际向区块链提交这个状态改变。这相当于调用以太坊节点的 eth_call。这通常用于模拟状态
改变函数的结果。如果函数调用成功，它将返回函数本身的返回值；如果函数调用失败，它将抛出异常。

请注意，这种调用适用于任何函数，无论它在智能合约中是标记为 view/pure 还是普通的状态改变函数。
它使你能够安全地预测状态改变操作的结果，而不实际执行这些操作。



*/


// contract.函数名.staticCall(参数, {override})
import { ethers } from 'ethers';
const ALCHEMY_MAINNET_URL = 'https://eth-mainnet.g.alchemy.com/v2/mXqbqtme85tkvSUbAWZYV';
const provider = new ethers.JsonRpcProvider(ALCHEMY_MAINNET_URL);

// 利用私钥和provider创建wallet对象
const privateKey = '0f03a73988c990c2333bbbcd99d442377fedbe48083a8a9c4426ace223c33e5d'
const wallet = new ethers.Wallet(privateKey, provider)

// DAI的ABI
const abiDAI = [
    "function balanceOf(address) public view returns(uint)",
    "function transfer(address, uint) public returns (bool)",
];
// DAI合约地址（主网）
const addressDAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI Contract

// 创建DAI合约实例
const contractDAI = new ethers.Contract(addressDAI, abiDAI, provider)

const main = async () => {
    try {
        const address = await wallet.getAddress()
        // 1. 读取DAI合约的链上信息
        console.log("\n1. 读取测试钱包的DAI余额")
        const balanceDAI = await contractDAI.balanceOf(address)
        const balanceDAIVitalik = await contractDAI.balanceOf("vitalik.eth")

        console.log(`测试钱包 DAI持仓: ${ethers.formatEther(balanceDAI)}\n`)
        console.log(`vitalik DAI持仓: ${ethers.formatEther(balanceDAIVitalik)}\n`)

        // 2. 用staticCall尝试调用transfer转账1 DAI，msg.sender为Vitalik，交易将成功
        console.log("\n2.  用staticCall尝试调用transfer转账1 DAI，msg.sender为Vitalik地址")
        // 发起交易
        const tx = await contractDAI.transfer.staticCall("vitalik.eth", ethers.parseEther("1"), { from: await provider.resolveName("vitalik.eth") })
        console.log(`交易会成功吗？：`, tx)

        // 3. 用staticCall尝试调用transfer转账10000 DAI，msg.sender为测试钱包地址，交易将失败
        console.log("\n3.  用staticCall尝试调用transfer转账1 DAI，msg.sender为测试钱包地址")
        const tx2 = await contractDAI.transfer.staticCall("vitalik.eth", ethers.parseEther("10000"), { from: address })
        console.log(`交易会成功吗？：`, tx2)

    } catch (e) {
        console.log(e);
    }
}
main()