import { clusterApiUrl } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo,useState,useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';import "./App.css";
import { web3, utils, Program, AnchorProvider } from "@project-serum/anchor"
import { SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, useAnchorWallet, WalletProvider, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import idl from "./idl.json"
import 'react-toastify/dist/ReactToastify.css';
require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
    
   

    return (
        <Context>
            <Content />
            
        </Context>
    );
};
export default App;



const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
            <ToastContainer />
        </ConnectionProvider>
        
    );
};

const Content: FC = () => {

    const [data, setData] = useState("a")
    useEffect(() => {
        fetch("https://murmuring-peak-29089.herokuapp.com/api").then(
            response => response.json()
        ).then(
            data => {
                setData(data.message)
            }
        )
    }, [])
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const programID = new web3.PublicKey(idl.metadata.address);
    let hasPerm=false;
    let mintAddress="";
  
    
    
    const sendWallet = async () => {
        try {
            
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: wallet?.publicKey }),
                
            };
            let data = await fetch('https://murmuring-peak-29089.herokuapp.com/data', requestOptions).then((res) => res.json()).then((data) => data)
            hasPerm = data.hasPermission;
           mintAddress = data.pickedNft
           const price = data.price
           console.log(hasPerm,"---",mintAddress)
           if(!hasPerm){
            toast.error('Your wallet doesnt have permission to mint right now!', {
                position: "top-right",
                autoClose: 25000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                });
            console.log("no perm")

            return
           } 
           if(!mintAddress){
            toast.error('NFTs are finished!', {
                position: "top-right",
                autoClose: 25000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                });
            console.log("no mint")
            return
           } 
            mintOne(mintAddress,price)
            
        } catch (err) {
           
            console.log(err)
        }
    }


    const mintOne = async (pickedNft: string,price:number) => {
        console.log(pickedNft, "<--------<")
        if (!wallet) return
        const provider = new AnchorProvider(
            connection, wallet, AnchorProvider.defaultOptions(),
        );
        // @ts-ignore
        const program = new Program(idl, programID, provider);
        let currentMintAccPk = new web3.PublicKey(pickedNft);


        const associatedTokenPk = await getAssociatedTokenAddress(currentMintAccPk, wallet.publicKey);

        let [escrowAccount, escrowAccountBump] =
            await web3.PublicKey.findProgramAddress(
                [currentMintAccPk.toBuffer(), utils.bytes.utf8.encode("secret_seed")],
                programID
            );

        console.log(associatedTokenPk.toBase58())

        console.log(escrowAccount, "<-- escrow account")
        try {
            const tx = new web3.Transaction().add(
                await program.methods.sellNft(escrowAccountBump).accounts({
                    minter: provider.wallet.publicKey,
                    minterTokenAcc: associatedTokenPk,
                    nftMint: currentMintAccPk,
                    nftHolderTokenAcc: escrowAccount,
                    systemProgram: web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                }).instruction()
            )

            tx.add(
                await SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new web3.PublicKey("6mHL2LPQQYrcVTk89NzhMH2oTLzomo6LPN7T69ARZUw6"),
                    lamports: price,
                })
            );

            await provider.sendAndConfirm(tx)

            try {
                toast.success('You have successfully minted!', {
                    position: "top-right",
                    autoClose: 25000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    });
                const requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: wallet?.publicKey , pickedNft:pickedNft}),
    
                };
               let _data = await fetch('https://murmuring-peak-29089.herokuapp.com/confrim', requestOptions).then((res) => res.json()).then((data) => console.log(data))
            } catch (err) {
                toast.error('Something went wrong!', {
                    position: "top-right",
                    autoClose: 25000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    });
                console.log(err)
            }
            

        } catch (error) {
            
            toast.error('Something went wrong!', {
                position: "top-right",
                autoClose: 25000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                });
            console.log(error)
        }

    }

    if(wallet){

        return (
            <div className="App">
                <ul >
                    <li>

                <WalletMultiButton />
                    </li>
                    <li>

                <button className="btn btn-success" onClick={sendWallet} >Mint One</button>
                <h2>{data}</h2>
                    </li>
                    
                <li>

                </li>
                </ul>
                <div>

                </div>
                <div>

                </div>
    
            </div>
        );
    }
    else{
        return (
            <div className="App">
               <ul >
                    <li>

                <WalletMultiButton />
                    </li>
                    <li>
                <h1>{data}</h1>
                    </li>
                    </ul>

                </div>
    
            </div>
        );
    }
};
