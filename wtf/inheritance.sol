// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Yeye{
    event Log(string msg);
    

    function hip()virtual public {
        emit Log('Yeye');
    }
    function hop()virtual  public{
        emit Log('Yeye hop');
    }

}

contract Baba is Yeye{
    modifier isEven(uint a)virtual {
        require(a%2==0,"should be a even");
        _;
    }
    function hip()override public virtual  {
        emit Log('baba');
    }
}
// 继承多个合约时，按辈分高低顺序写
contract Me is Yeye,Baba{
    // 一个方法在多个继承的合约有实现，则自合约必须重写
    // 重写在多个继承合约有的方法时，需要按辈分协商合约顺序
    function hip()public override(Yeye,Baba) {
        emit Log('me');
    }
    function callParent()public{
        super.hip();
    }
    // 修饰符的继承
    function doubleTrible(uint n) public isEven(n)pure returns (uint,uint){
        return (n*2,n*3);
    }
}

// 2.构造函数的继承
abstract contract A {
    uint public a;

    constructor(uint _a) {
        a = _a;
    }
}
// 方法1  在继承是声明父构造函数的参数
contract C is A(1){

}
// 方法2 在构造函数中声明构造函数的参数
contract C2 is A{
    constructor(uint _c)A(_c*_c){}
}