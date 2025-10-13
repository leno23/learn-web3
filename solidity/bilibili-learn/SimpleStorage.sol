// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract SimpleStorage {
    uint256 favoriteNumber;

    struct People {
        string name;
        uint256 favoriteNumber;
    }
    mapping(string => uint256) public nameToFavoriteNumber;

    People[] public people;

    function store(uint256 _favoriteNumber) public {
        favoriteNumber = _favoriteNumber;
    }
    function retrive() public view returns (uint256) {
        return favoriteNumber;
    }
    function addPerson(string calldata name, uint256 _favoriteNumber) public {
        people.push(People(name, _favoriteNumber));
        nameToFavoriteNumber[name] = _favoriteNumber;
    }
}
