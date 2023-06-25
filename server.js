import express from 'express';
import fs from 'fs';
import stripePackage from 'stripe';

let stripePublicKey;
let stripePrivateKey;

async function loadEnvVariables() {
  if (process.env.NODE_ENV !== 'production') {
    const dotenv = await import('dotenv');
    dotenv.default.config();
  }

  stripePublicKey = process.env.STRIPE_PUBLIC_KEY;
  stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;

  console.log(stripePublicKey, stripePrivateKey);
}

async function startServer() {
  await loadEnvVariables();

  const app = express();
  const port = 3001;
  const stripe = stripePackage(stripePrivateKey);

  app.use(express.json());
  app.use(express.static('public'));

  app.set('view engine', 'ejs');

  app.get('/store', (req, res) => {
    fs.readFile('items.json', (error, data) => {
      if (error) {
        res.status(500).end;
      } else {
        res.render('store.ejs', {
          items: JSON.parse(data),
          stripePublicKey: stripePublicKey,
        });
      }
    });
  });

  app.post('/purchase', (req, res) => {
    fs.readFile('items.json', (error, data) => {
      if (error) {
        res.status(500).end;
      } else {
        const itemsJson = JSON.parse(data);
        const itemsArray = itemsJson.music.concat(itemsJson.merch);
        let total = 0;
        req.body.items.forEach((item) => {
          const itemjson = itemsArray.find((i) => i.id == item.id);
          total = total + itemjson.price * item.quantity;
        });

        stripe.charges
          .create({
            amount: total,
            source: req.body.stripeTokenId,
            currency: 'usd',
          })
          .then(() => {
            console.log('Charge successful');
            res.json({
              message: 'Successfully purchased items',
            });
          })
          .catch(() => {
            console.log('Charge failed');
            res.status(500).end();
          });
      }
    });
  });

  app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
  });
}
startServer();
