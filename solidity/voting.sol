// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Voting {
    // 候选人和得票数的映射
    mapping(string => uint256) votes;
    // 当前投票人
    address owner;
    // 记录候选人是否存在
    mapping(string => bool) exists;
    // 存储所有候选人的数组
    string[] candidates;

    constructor() {
        // 设置当前投票人
        owner = msg.sender;
    }

    // 添加候选人
    function addCandidate(string memory candidate) public {
        exists[candidate] = true;
        candidates.push(candidate);
    }
    // 给某个候选人投票
    function vote(string memory candidate) public {
        require(exists[candidate], "candidate does not exist");
        votes[candidate] += 1;
    }

    // 获取某个候选人的得票数
    function getVotes(string memory candidate) public view returns (uint256) {
        return votes[candidate];
    }

    // 重置所以候选人的选票
    function resetVotes() public {
        for (uint256 i = 0; i < candidates.length; i++) {
            string memory candidate = candidates[i];
            delete votes[candidate];
            delete exists[candidate];
        }
    }
}
