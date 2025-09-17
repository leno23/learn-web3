## web3学习记录

250909  实现插入排序


### 目的
1.solidity写到简历
2.evn底层原理去分析solidity代码的一些问题，解决面试中80% solidity+合约开发的问题
3.拥有合约业务开发、测试和部署的能力

### 1.基础入门
语法、基本数据结构（条件判断、循环）

### 2.进阶
语言特性（全局变量、接口、继承、日志、错误处理、ABI、EVM操作码、内敛汇编、gas优化）

JS Java语言和结构基础
建议学习 5-6个小时

验证
- 能够在不借助工具的情况下，，将solidity工程代码翻译到业务逻辑
- 能够尝试使用EVM部分的知识去解释回答一些solidity的问题

### 项目实践
Hardhat安全帽 测试  开发合约以及部署 Fundry、Truffle
预言机 openzepplin  （ERC20 ERC720）  EIP（是什么，常见）
代理 多签钱包常见的设计模式 在 实际项目开发的应用
时不时带入面试题场景题 ==》 场景（开发经验）

建议时间  2-3天
验证
- 能够独立搭建一个hardhat工程
- 能够编写基础合约业务
动手一起写项目

-----
数据分类
### 基本类型
长度固定 实际数据就在Stack

### 整数
uint -> usigned没有符号 -+正负
int

### 引用类型
长度未知或者超过32bit  实际数据在Memory或者Storage上
Stack只有一个keccak256类型的哈希


每发生一次交互（交易），都发生了什么
区块链创建一个EVM执行合约的bytecode =>  对数据的处理运算

> EVM的存储结构
- Stack 栈
1024个slot  超过报错  stack too deep
每个slot 32个字节 ==> 256bit（二进制位）

- Memory
evm自身内存
- Storage
  在链上永久存储

> 函数的基本语法
```solidity
// 基本函数结构
function functionName(参数类型 参数名) 
可见性修饰符 状态可变性修饰符 returns (返回类型){
    // 函数体
}
```
> 可见修饰符  
- public 都可以
- external  其他合约 + 外部账户
- private  当前合约
- internal   当前合约 + 子合约

> 状态可见性修饰符
- pure  不可读不可写
- view  可读不可写
- default 可读可写

> payable
- payable函数： 可接受ETH

![Image](https://github.com/user-attachments/assets/6097c6f9-ae42-40de-868c-892b3416c900)

![Image](https://github.com/user-attachments/assets/f529858a-736b-44b9-b168-006ea098c014)

> calldata、memory和storage
作用于函数，以及内部变量声明

- 1.Storage
    - 特点：永久存储在区块链上 stateDB
    - Gas成本：最高
    - 使用场景：合约状态变量，函数内部变量声明
    - 类比：类似计算机的硬盘存储

- 2.Memory
    - 特点：临时存储，函数执行完销毁
    - Gas成本中
    - 使用场景：函数参数，返回值， 函数内部变量声明
    - 类比：计算机内存
- 3. Calldata
    - 特点：临时存储
    - Gas成本：最低
    - 使用场景：外部函数的参数 函数返回(直接返回calldata参数)
    - 只读内存
Memory可以基于calldata得到
calldata不能在函数中声明

> solidyty为什么要设计这三个修饰符？

EVM的设计决定了 stack、memory、stateDB这三个对象，而且他们的gas消耗、性能都不一样

solidity是给开发者一个比较符合人机工程的语法，让开发者能够对这块儿操作做一个优化
