// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeMathTester{
    uint8 public bigNum = 255;  

    function add() public{
        // 0.8.0 之前版本会unckecked 执行成功，不报错
        bigNum = bigNum+1;
    }
}