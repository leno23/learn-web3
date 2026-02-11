// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "./PriceConverter.sol";

// chainlink喂价可以以去中心化的方式从现实世界中读取定价信息或其他数据
contract FundMe {
    using PriceConverter for uint256;

    // 优化 1: 加上 constant 关键字，节省 Gas
    uint256 public constant MINIMUM_USD = 50 * 1e18;

    address[] public funders;

    // 优化 2: 加上 immutable 关键字，节省 Gas  约定以i_开头
    address public immutable i_owner;

    mapping(address => uint256) public addressToAmountFunded;
    // 864849   ->  821721 添加immutable和constant 关键词后
    constructor() {
        i_owner = msg.sender;
    }

    function fund() public payable {
        require(
            msg.value.getConversionRate() >= MINIMUM_USD,
            "at least One Ether"
        );
        funders.push(msg.sender);
        addressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            addressToAmountFunded[funder] = 0;
        }
        // 重置数组
        funders = new address[](0);

        // transfer (注释掉的)
        // payable(msg.sender).transfer(address(this).balance);

        // send (注释掉的)
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess,"Send failed");

        // call
        // 修复 3: 这里的变量名写错了。
        // 之前定义的是 callSuccess，但 require 检查的是 sendSuccess（未定义）。
        // 另外，bytes memory dataResurned 不需要使用，可以省略。
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Sender isn't owner!");
        _;
    }
}
