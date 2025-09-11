// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Algo {
    function reverseStr(string memory str) public pure returns (string memory) {
        uint256 len = bytes(str).length;
        bytes memory res = new bytes(len);

        // 保证不出错，跳过检查，节省gas
        unchecked{
            for (uint256 i = len; i > 0; i--) {
                res[len - i] = bytes(str)[i - 1];
            }
        }
        return string(res);
    }

    function romanToInt(string memory s) public pure returns (int256) {
        bytes memory romanBytes = bytes(s);
        int256 result = 0;
        int256 prevValue = 0;
        
        for (uint256 i = 0; i < romanBytes.length; i++) {
            int256 currentValue = getRomanValue(romanBytes[i]);
            
            if (currentValue > prevValue) {
                result += currentValue - 2 * prevValue;
            } else {
                result += currentValue;
            }
            
            prevValue = currentValue;
        }
        
        return result;
    }
    function getRomanValue(bytes1 c) private pure returns (int256) {
        if (c == 'I') return 1;
        if (c == 'V') return 5;
        if (c == 'X') return 10;
        if (c == 'L') return 50;
        if (c == 'C') return 100;
        if (c == 'D') return 500;
        if (c == 'M') return 1000;
        return 0;
    }
    
    function intToRoman(int256 num) public pure returns (string memory) {
        require(num >= 1 && num <= 3999, "Number must be between 1 and 3999");
        
        int256[13] memory values = [int256(1000), 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        string[13] memory numerals = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
        
        string memory result = "";
        
        for (uint256 i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                result = string(abi.encodePacked(result, numerals[i]));
                num -= values[i];
            }
        }
        
        return result;
    }
    
    // ========== Merge Sorted Array ==========
    function mergeSortedArrayOptimized(
        int256[] memory nums1,
        uint256 m,
        int256[] memory nums2,
        uint256 n
    ) public pure returns (int256[] memory) {
        int256[] memory result = new int256[](m + n);
        uint256 i = 0; // pointer for nums1
        uint256 j = 0; // pointer for nums2
        uint256 k = 0; // pointer for result
        
        while (i < m && j < n) {
            if (nums1[i] <= nums2[j]) {
                result[k] = nums1[i];
                i++;
            } else {
                result[k] = nums2[j];
                j++;
            }
            k++;
        }
        
        // Copy remaining elements from nums1
        while (i < m) {
            result[k] = nums1[i];
            i++;
            k++;
        }
        
        // Copy remaining elements from nums2
        while (j < n) {
            result[k] = nums2[j];
            j++;
            k++;
        }
        
        return result;
    }
   
    
    function binarySearch(int256[] memory nums, int256 target) public pure returns (uint256) {
        uint256 left = 0;
        uint256 right = nums.length;
        
        while (left < right) {
            uint256 mid = left + (right - left) / 2;
            
            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        return left;
    }
    
    // ========== Utility Functions for Testing ==========
    
    function testRomanToInt() public pure returns (bool) {
        // Test cases
        require(romanToInt("III") == 3, "III should be 3");
        require(romanToInt("LVIII") == 58, "LVIII should be 58");
        require(romanToInt("MCMXC") == 1990, "MCMXC should be 1990");
        return true;
    }
}
