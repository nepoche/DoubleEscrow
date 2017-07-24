pragma solidity ^0.4.8;

contract Escrow {

	uint public price;
	address public seller;
	address public buyer;

	enum State { Created, Locked, Inactive }
	State public state;

	event Aborted();
	event PurchaseConfirmed();
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
	}

	function abort() onlySeller inState(State.Created) {
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		Aborted();
	}

	function confirmPurchase() payable inState(State.Created) require(msg.value == 2 * price) {
		buyer = msg.sender;
		state = State.Locked;
		PurchaseConfirmed();
	}

	function confirmReceived() onlyBuyer inState(State.Locked) {
		if (!buyer.send(price)) throw;
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		ItemReceived();
	}

	function refundBuyer() onlySeller inState(State.Locked) {
		if (!buyer.send(2 * price)) throw;
		if (!seller.send(this.balance)) throw;
		state = State.Inactive;
		Refunded();
	}

	function getState() returns (State) {
		return state;
	}

	function () { throw; }
}