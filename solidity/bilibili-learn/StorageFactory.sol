// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SimpleStorage} from './SimpleStorage.sol';

contract StorageFactory{
    SimpleStorage[] simpleStorageArr;

    function createSimpleStorageContract() public {
        SimpleStorageArr.push(new SimpleStorage())
    }

    function sfStore() public{
        
    }

}