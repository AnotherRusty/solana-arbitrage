import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createTransferCheckedInstruction } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";



export const sleep = (time: number) => {
  return new Promise(resolve => setTimeout(resolve, time))
}

export const createTokenTransferTx = async (
    connection: Connection,
    owner: PublicKey,
    treasury: PublicKey,
    mint: PublicKey,
    amount: number
  ) => {
  
    let decimal = await getTokenDecimal(mint, connection)
  
    let userTokenAccount = await getTokenAccount(mint, owner, connection);
  
    let tx = new Transaction();
    
    let ret = await getATokenAccountsNeedCreate(connection, owner, treasury, [mint]);
    
    if (ret && ret.instructions && ret.instructions.length > 0) {
      ret.instructions.map((ix) => tx.add(ix));
    }
  
    tx.add(createTransferCheckedInstruction(
      userTokenAccount, // from (should be a token account)
      mint, // mint
      ret.destinationAccounts[0], // to (should be a token account)
      owner, // from's owner
      amount, // amount, if your deciamls is 8, send 10^8 for 1 token
      decimal // decimals
    ))
    return tx
  }

  
export const getTokenDecimal = async (
    mint: PublicKey,
    connection: Connection
  ) => {
    try {
      let parsedAccountData = await connection.getParsedAccountInfo(mint);
      let decimal = (parsedAccountData?.value?.data as ParsedAccountData).parsed.info.decimals;
      return decimal as number
    } catch (e) {
      console.log(e)
      return 9
    }
  }

  
export const getTokenAccount = async (mintPk: PublicKey, userPk: PublicKey, connection: Connection): Promise<PublicKey> => {
    let tokenAccount = await connection.getProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165
          },
          {
            memcmp: {
              offset: 0,
              bytes: mintPk.toBase58()
            }
          },
          {
            memcmp: {
              offset: 32,
              bytes: userPk.toBase58()
            }
          },
        ]
      }
    );
    return tokenAccount[0].pubkey;
  }
  
  
export const getATokenAccountsNeedCreate = async (
    connection: Connection,
    payer: PublicKey,
    owner: PublicKey,
    nfts: PublicKey[],
  ) => {
    let instructions = [], destinationAccounts = [];
    for (const mint of nfts) {
      const destinationPubkey = await getAssociatedTokenAccount(owner, mint);
      const response = await connection.getAccountInfo(destinationPubkey);
      if (!response) {
        const createATAIx = createAssociatedTokenAccountInstruction(
          destinationPubkey,
          payer,
          owner,
          mint,
        );
        instructions.push(createATAIx);
      }
      destinationAccounts.push(destinationPubkey);
    }
    return {
      instructions,
      destinationAccounts,
    };
  }
  
  
export const getAssociatedTokenAccount = async (ownerPubkey: PublicKey, mintPk: PublicKey): Promise<PublicKey> => {
    let associatedTokenAccountPubkey = (await PublicKey.findProgramAddress(
      [
        ownerPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPk.toBuffer(), // mint address
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    ))[0];
    return associatedTokenAccountPubkey;
  }
  
  
export const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress: PublicKey,
    payer: PublicKey,
    walletAddress: PublicKey,
    splTokenMintAddress: PublicKey
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    return new TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from([]),
    });
  }