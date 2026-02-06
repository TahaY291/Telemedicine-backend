import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
    path: './env'
})
    
await connectDB()
.then(()=> {
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`serveris running on the port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MongoDb Connection failed" , err)
})
