// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MySort {
    function sort(uint256[] memory a) public pure returns (uint256[] memory) {
        uint256 aLen = a.length;
        for (uint256 i = 1; i < aLen; i++) {
            uint256 cur = a[i];
            uint256 l = 0;
            uint256 r = i;
            while (l < r) {
                uint256 m = (l + r) >> 1;
                if (cur >= a[m]) {
                    l = m + 1;
                } else {
                    r = m;
                }
            }
            for (uint256 j = i; j > l; j--) {
                a[j] = a[j - 1];
            }
            a[l] = cur;
        }
        return a;
    }
}
