import express, { urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(cors({
    credentials:true
}))

app.use(express.json({limit:"16kb"}));
app.use(urlencoded({ extended: true })); 
app.use(express.static("public"));
app.use(cookieParser())

import router from './routes/user.routes.js';

app.use("/api/v1/users",router);

export {app}
