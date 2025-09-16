// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Hello{
    string public str = 'hello';

    function get()public payable returns (uint256  ){
        return msg.value;
    }
}