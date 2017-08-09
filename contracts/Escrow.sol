pragma solidity ^0.4.8;

contract Escrow {

	uint public price;
	address public seller;
	address public buyer;

	enum State { Created, Locked, Inactive }
	State public state;

	event Created(address seller, uint price);
	event Aborted();
	event PurchaseConfirmed(address buyer);
	event ItemReceived();
	event Refunded();

	modifier require(bool condition) {
		if (!condition) throw;
		_;
	}

	modifier onlyBuyer() {
		if (msg.sender != buyer) throw;
		_;
	}

	modifier onlySeller() {
		if (msg.sender != seller) throw;
		_;
	}

	modifier inState(State s) {
		if (state != s) throw;
		_;
	}

	function Escrow() {
		state = State.Inactive;
	}

	function postItem() payable require(msg.value % 2 == 0) inState(State.Inactive) {
		seller = msg.sender;
		price = msg.value / 2;
		state = State.Created;
		Created(seller, price);
	}

	function abort() onlySeller inState(State.Created) {
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		price = 0;
		Aborted();
	}

	function confirmPurchase() payable inState(State.Created) require(msg.value == 2 * price) {
		buyer = msg.sender;
		state = State.Locked;
		PurchaseConfirmed(buyer);
	}

	function confirmReceived() onlyBuyer inState(State.Locked) {
		if (!buyer.send(price)) throw;
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		price = 0;
		ItemReceived();
	}

	function refundBuyer() onlySeller inState(State.Locked) {
		if (!buyer.send(2 * price)) throw;
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		price = 0;
		Refunded();
	}

	function () { throw; }
}