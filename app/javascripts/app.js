// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import escrow_artifacts from '../../build/contracts/Escrow.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var Escrow = contract(escrow_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;
var seller;
var buyer;
var user;
var currentState;
var price;

window.App = {

  start: function() {
    var self = this;

    Escrow.setProvider(web3.currentProvider);

    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      self.setStatus("Initial load of contract state");

      self.updatePage();

      self.listenToEvents();

    });
  },

  updatePage: function() {
    Escrow.deployed().then(function(instance) {
      return instance.state.call(); 
    })
    .then(function(response) {
      currentState = response.toString(10).valueOf();
      App.checkUser();
    });
  },

  checkUser: function() {

    // set initial user variable to unknown
    user = 'unknown';

    // check for seller
    Escrow.deployed().then(function(instance){
      return instance.seller.call();
    })
    .then(function(response){
      seller = response.toString(10);
      if (account == seller)
        user = 'seller';
      App.updateChoices();
    });

    // check for buyer
    Escrow.deployed().then(function(instance){
      return instance.buyer.call();
    })
    .then(function(response){
      buyer = response.toString(10);
      if (account == buyer)
        user = 'buyer';
      App.updateChoices();
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  updateChoices: function() {

    // set up variables for price
    var priceLabel = document.getElementById("priceInfo");
    price = 0;

    // get the price from the contract
    Escrow.deployed().then(function(instance){
      return instance.price.call();
    })
    .then(function(response) {
      price = response.toString(10).valueOf();
      price = web3.fromWei(price, 'ether');
      if (price != 0)
        priceLabel.innerHTML = "Current Price in ETH: <span id=\"price\">" + price + "</span>";
      else
        priceLabel.innerHTML = "No sellers, sell this item now!";
    });

    // clear the current choices
    document.getElementById("selectAction").innerHTML = "";

    // Created State
    if (currentState == '0') {

      // view for seller
      if (user == 'seller') {

        // make the abort button
        var abortButton = document.createElement("button");
        var text = document.createTextNode("Abort");
        abortButton.setAttribute("id", "abort");
        abortButton.setAttribute("onclick", "App.abort()");

        abortButton.appendChild(text);
        document.getElementById("selectAction").appendChild(abortButton);
      }
      // view for other
      else {
        
        // make the purchase button
        var purchaseButton = document.createElement("button");
        var text = document.createTextNode("Purchase");
        purchaseButton.setAttribute("id", "purchase");
        purchaseButton.setAttribute("onclick", "App.purchase()");

        purchaseButton.appendChild(text);
        document.getElementById("selectAction").appendChild(purchaseButton);

      }
    }

    // Locked State
    if (currentState == '1') {
      // view for seller
      if (user == 'seller') {

        // make the refund button
        var refundButton = document.createElement("button");
        var text = document.createTextNode("Refund");
        refundButton.setAttribute("id", "refund");
        refundButton.setAttribute("onclick", "App.refund()");

        refundButton.appendChild(text);
        document.getElementById("selectAction").appendChild(refundButton);

      }
      // view for buyer
      else if (user == 'buyer') {

        // make the confirm button
        var confirmButton = document.createElement("button");
        var text = document.createTextNode("Confirm");
        confirmButton.setAttribute("id", "confirm");
        confirmButton.setAttribute("onclick", "App.confirm()");

        confirmButton.appendChild(text);
        document.getElementById("selectAction").appendChild(confirmButton);

      }
      // view for other
      else {

        // show item is sold
        var notice = document.createElement("h3");
        notice.innerHTML = "This item has been sold.";
        document.getElementById("selectAction").appendChild(notice);
      }
    }

    // Inactive State
    if (currentState == '2') {
      // view for anyone

      // make label for the price field
      var label = document.createElement("h3");
      label.innerHTML = "Enter your price (in ETH):";
      document.getElementById("selectAction").appendChild(label);

      // make the price field
      var priceInput = document.createElement("input");
      priceInput.setAttribute("type", "number");
      priceInput.setAttribute("id", "priceInput");
      document.getElementById("selectAction").appendChild(priceInput);

      // make sell button
      var sellButton = document.createElement("button");
      var text = document.createTextNode("Sell this item");
      sellButton.setAttribute("id", "sell");
      sellButton.setAttribute("onclick", "App.sell()");

      sellButton.appendChild(text);
      document.getElementById("selectAction").appendChild(sellButton);
    }
  },

  sell: function() {
    this.setStatus("Creating your sale post...");
    var priceInEth = document.getElementById("priceInput").value;
    var totalDepositInWei = web3.toWei(priceInEth*2, 'ether');
    var self = this;

    Escrow.deployed().then(function(instance){
      return instance.postItem({value: totalDepositInWei, from: account});
    })
    .then(function (){
      self.setStatus("Sale posted.");
    })
    .catch(function(e){
      console.log(e);
      self.setStatus("Error posting the sale, please check logs.");
    });
  },

  abort: function() {
    this.setStatus("Aborting Sale...");
    var self = this;

    Escrow.deployed().then(function(instance){
      return instance.abort({from: account});
    })
    .then(function (){
      self.setStatus("Sale successfully aborted.");
    })
    .catch(function(e){
      console.log(e);
      self.setStatus("Error aborting sale, are you sure you are the seller?");
    });
  },

  purchase: function() {
    this.setStatus("Purchasing Item...");
    var self = this;

    App.getPrice();

    Escrow.deployed().then(function(instance){
      return instance.confirmPurchase({from: account, value: web3.toWei(price*2, 'ether')});
    })
    .then(function (){
      self.setStatus("Item successfully purchased. Please wait for the item to arrive.");
    })
    .catch(function(e){
      console.log(e);
      self.setStatus("Error purchasing item, please check logs.");
    });
  },

  refund: function() {
    this.setStatus("Refunding buyer...");
    var self = this;

    Escrow.deployed().then(function(instance){
      return instance.refundBuyer({from: account});
    })
    .then(function (){
      self.setStatus("Buyer successfully refunded");
    })
    .catch(function(e){
      console.log(e);
      self.setStatus("Error refunding buyer, are you sure you are the seller?");
    });
  },

  confirm: function() {
    this.setStatus("Confirming item is as expected...");
    var self = this;

    Escrow.deployed().then(function(instance){
      return instance.confirmReceived({from: account});
    })
    .then(function (){
      self.setStatus("Item validated, funds distributed.");
    })
    .catch(function(e){
      self.setStatus("Error confirming purchase, are you sure you are the buyer?");
    });
  },

  getPrice: function() {
    price = document.getElementById("price").innerHTML.valueOf();
  },

  listenToEvents: function() {

    Escrow.deployed().then(function(escrow){
      var createdEvent = escrow.Created();
      createdEvent.watch(function(err, res) {
        if (err) {
          console.log(err);
          return;
        }

        currentState = 0;
        if (res.args.seller == account)
          user = 'seller';
        App.updateChoices();

      });
    });

    Escrow.deployed().then(function(escrow){
      var abortedEvent = escrow.Aborted();
      abortedEvent.watch(function(err, res) {
        if (err) {
          console.log(err);
          return;
        }

        App.updatePage();
      });
    });

    Escrow.deployed().then(function(escrow){
      var purchaseConfirmedEvent = escrow.PurchaseConfirmed();
      purchaseConfirmedEvent.watch(function(err, res) {
        if (err) {
          console.log(err);
          return;
        }

        App.updatePage();
      });
    });

    Escrow.deployed().then(function(escrow){
      var receivedEvent = escrow.ItemReceived();
      receivedEvent.watch(function(err, res) {
        if (err) {
          console.log(err);
          return;
        }

        App.updatePage();
      });
    });

    Escrow.deployed().then(function(escrow){
      var refundedEvent = escrow.Refunded();
      refundedEvent.watch(function(err, res) {
        if (err) {
          console.log(err);
          return;
        }

        App.updatePage();
      });
    });

  }

};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
