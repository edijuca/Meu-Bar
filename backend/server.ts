import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, createTables } from './db';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize DB and start server
createTables().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
