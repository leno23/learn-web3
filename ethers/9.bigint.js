// 以太坊中，需要计算都会超过JS的整数安全值(2**53-1)，所以需要使用BigInt来处理大整数
// 例如，需要存储以太坊中的wei

import { ethers } from 'ethers';
const wei = ethers.parseEther('1')
console.log(wei)

const oneWei = ethers.getBigInt("10000")
console.log(oneWei)

const ether = ethers.formatEther(wei)
console.log(ether)

// wei 0
// kwei 10**3
// mwei 10**6
// gwei 10**9
// szabo 10**12
// finney 10**15
// ether 10**18
// kether 10**21
// mether 10**24
// gether 10**27
// tether 10**30


console.log('wei转gwei', ethers.formatUnits(1000000000, "gwei"));
console.log('wei转ether', ethers.formatUnits(1000000000));

// 大单位转小单位
console.log('1ether转wei', ethers.parseEther("1.0").toString());

console.log('1ether转gwei', ethers.parseUnits("1.0", "gwei").toString());