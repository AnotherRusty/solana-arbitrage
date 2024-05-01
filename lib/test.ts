
import fs from 'fs';
import path from 'path';
import {
    PublicKey,
    Connection,
    Keypair
} from '@solana/web3.js';
import { swap } from './script';
import { SOL_ADDRESS, USDC_ADDRESS, BONK_ADDRESS, VEUR_ADDRESS, HELI_ADDRESS, NEW_ADDRESS } from './types';
import { sleep } from './util';

const main = async () => {

    try {
       
        do {
            await swap([SOL_ADDRESS, USDC_ADDRESS], 1000)
            await sleep(3000)
        } while (true)
    } catch (e) {
        console.log("err ", e)
    }
}

main()