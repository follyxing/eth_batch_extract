'use strict'
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
var async = require('async');

var web3 = new Web3(Web3.givenProvider || 'http://127.0.0.1:8545');
const BN = web3.utils.BN;


function withdraw_eth(from, to, pk, amount, callback) {
  if (!from || !to || !pk || !amount) {
    console.error('[ERROR] Paramaters Error !')
    callback()
    return;
  }
  if (!web3.utils.isAddress(from)) {
    console.log(from);
    console.error('[ERROR] \'from\' Address Error !');
    callback()
    return;
  }
  if (!web3.utils.isAddress(to)) {
    console.log(to);
    console.error('[ERROR] \'to\' Address Error !');
    callback()
    return;
  }
  async.waterfall([
    (cb) => {
      console.log('getting gasePrice ...');
      web3.eth.getGasPrice().then((gasPrice) => {
        console.log('gasePrice : ' + gasPrice);
        cb(null, gasPrice);
      }).catch((e) => {
        console.log(e);
        cb(e);
      });
    },
    (gasPrice, cb) => {
      console.log('getting nonce ...');
      web3.eth.getTransactionCount(from).then((nonce) => {
        console.log('nonce : ' + nonce);
        cb(null, gasPrice, nonce);
      }).catch((e) => {
        console.log(e);
        cb(e);
      });

    },
    (gasPrice, nonce, cb) => {
      let gasLimit = 21000;
      let costWei = new BN(gasPrice * gasLimit);
      if (pk.length === 66) {
        pk = pk.substring(2, pk.length);
      }
      var privateKey = new Buffer(pk, 'hex')
      let value = new BN(web3.utils.toWei(amount, 'ether')).sub(costWei);

      var rawTx = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: to,
        value: web3.utils.toHex(value),
        data: '',
        chainId: 1
      }

      var tx = new Tx(rawTx);
      tx.sign(privateKey);

      var serializedTx = tx.serialize();
      serializedTx = '0x' + serializedTx.toString('hex');
      cb(null, serializedTx);
    },
    (serializedTx, cb) => {
      console.log('== tx :' + serializedTx);
      web3.eth.sendSignedTransaction(serializedTx).on('transactionHash', (hash) => {
        console.log('txid:' + hash);
        console.log('DONE!');
        cb();
        callback();
      }).on('receipt', (err) => {
        console.log(err);
      }).catch((e) => {
        // console.log(e);
        callback();
      });

    }
  ])
}


function withdraw_eth_all() {
  fs.readFile('./balance.txt', function (err, data) {
    let items = data.toString().split('\n\b');
    async.forEachOfLimit(items, 1, function (item, key, callback) {
      let i = item.split(',');
      console.log(i[0]);
      let self = this;
      withdraw_eth(i[0], '0x4F389762a7AB841e866c6EAfF45A63B99a822fA4', i[1], i[2], () => {
        callback();
      });
    });

  });
}

function getBalance() {
  fs.readFile('./eth.txt', function (err, data) {
    let str = data.toString();
    let rows = str.split('\n');
    async.forEachOfLimit(rows, 5, function (item, key, callback) {
      let addr = item.split(',')[0];
      let pk = item.split(',')[1];
      web3.eth.getBalance(addr).then((balance) => {
        console.log(balance);
        if (balance > 0) {
          let d = addr + ',' + pk + ',' + web3.utils.fromWei(balance) + '\n\b';
          fs.appendFile('./balance.txt', d, function (err) {
            if (err) console.error("[ERROR] " + err);
            console.log("Success :" + d);
          })
        }
      });
      setTimeout(() => {
        callback();
      }, 500);

    });

  });
}

getBalance();
// withdraw_eth_all();