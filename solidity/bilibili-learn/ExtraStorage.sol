// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./SimpleStorage.sol";

// 继承可以使用父合约的所有 属性方法
contract ExtraStorage is SimpleStorage{
    // 如果重写了父合约的方法，需要表上override
    function store(uint256 _favNum) public override {
        favoriteNumber = _favNum + 5;
    }
}