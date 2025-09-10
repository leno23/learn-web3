// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Algo {
    function reverseStr(string memory str) public pure returns (string memory) {
        uint256 len = bytes(str).length;
        bytes memory res = new bytes(len);
        for (uint256 i = len; i > 0; i--) {
            res[len - i] = bytes(str)[i - 1];
        }
        return string(res);
    }
}
