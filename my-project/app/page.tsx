"use client";
import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import moment from "moment";
dotenv.config();
export default function Home() {
  const [blockResult, setBlockResult] = useState<any[]>([]);
  const [Field, setField] = useState<string>("blockNumber");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [totalTransactions, setTotalTransaction] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [toggleTimestamps, setToggleTimestamps] = useState<boolean[]>([]);
  const [toggleNonces, setToggleNonces] = useState<boolean[]>([]);

  const [search, setSearch] = useState<string>("");

  interface Block {
    blockDetails: ethers.providers.Block;
    number: number;
    blockHash: string;
    timeStamp: string;
    gasUsed: string;
    nonce: string;
  }

  const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.infura.io/v3/01d39543d4884207bdccff4e64f5c7ee"
  );

  const MAX_STORED_BLOCKS = 10; // Maximum number of blocks to store in local storage

 

  const getBlockInfo = async () => {
    try {
      const response = await axios.get<Block[]>("http://localhost:5001/block");
      const sortedBlocks = response.data.reverse();
      console.log(sortedBlocks,"sortedBlocks")
      const blockDetailsPromises = sortedBlocks.map(
        async (block: {
          number: number;
          blockHash: string;
          timeStamp: string;
          gasUsed: string;
          nonce: string;
        }) => {
          const blockDetails = await provider.getBlockWithTransactions(
            block.number
          );
          return {
            blockDetails,
            number: block.number,
            blockHash: block.blockHash,
            timeStamp: block.timeStamp,
            gasUsed: block.gasUsed,
            nonce: block.nonce,
          };
        }
      );
      const blockDetails = await Promise.all(blockDetailsPromises);

      const latestBlock = await provider.getBlockNumber();
      setBlockResult(blockDetails);
      setTotalTransaction(blockResult.length.toString());
      setLoading(false);
      setOfflineMode(false);
      
    

      let arr = []
      for (let i = 0; i < 10; i++) {
        let obj = {
          blockDetails: sortedBlocks[i]
        }
        arr.push(obj)

      }

      localStorage.setItem("blocks", JSON.stringify(arr))
     

     
    } catch (error) {
      setOfflineMode(true);
      setLoading(false);
      const storedBlocks = localStorage.getItem("blocks");
      if (storedBlocks) {
        setBlockResult(JSON.parse(storedBlocks));
      }
      console.log("error:", error);
    }
  };
  useEffect(() => {
    const interval = setInterval(() => {
      getBlockInfo();
    }, 20000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.removeItem("blocks");
    }, 20000);

    return () => clearTimeout(timeoutId);
  }, [blockResult]);

 
  const sortBlocks = (blocks: any[], field: string, order: string) => {
    const sortedBlocks = [...blocks].sort((a, b) => {
      const valueA = a.blockDetails[field];
      const valueB = b.blockDetails[field];
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    });
    return order === "asc" ? sortedBlocks : sortedBlocks.reverse();
  };

  useEffect(() => {
    const sortedBlocks = sortBlocks(blockResult, Field, sortOrder);
    setBlockResult(sortedBlocks);
  }, [Field, sortOrder]);

  const handleDeleteBlock = async (blockNumber: number) => {
    await axios.delete(`http://localhost:5001/block/${blockNumber}`);
    const updatedBlocks = getBlockInfo();
    localStorage.setItem("blocks", JSON.stringify(updatedBlocks));
  };

  const handleDeleteAllBlock = async () => {
    await axios.delete(`http://localhost:5001/all`);
    setBlockResult([]);
    localStorage.removeItem("blocks");
  };

  const searchBlock = async (blockNumber: number) => {
    const response = await axios.get(
      `http://localhost:5001/block/${blockNumber}`
    );
    const blockDetails = await provider.getBlockWithTransactions(
      response.data.number
    );

    setBlockResult([
      {
        blockDetails,
        number: response.data.number,
        blockHash: response.data.blockHash,
        timeStamp: response.data.timeStamp,
        gasUsed: response.data.gasUsed,
        nonce: response.data.nonce,
      },
    ]);
    console.log("response", response);
  };

  const handleToggleFieldFormat = (index: number, field: string) => {
    if (field === "timestamp") {
      const updatedToggleTimestamps = [...toggleTimestamps];
      updatedToggleTimestamps[index] = !updatedToggleTimestamps[index];
      setToggleTimestamps(updatedToggleTimestamps);
    } else if (field === "nonce") {
      const updatedToggleNonces = [...toggleNonces];
      updatedToggleNonces[index] = !updatedToggleNonces[index];
      setToggleNonces(updatedToggleNonces);
    }
  };

  useEffect(() => {
    getBlockInfo();
  }, []);

  return (
    <>
      <div className="flex items-center bg-gray-200 rounded-lg m-2 p-4">
        <h1 className="font-bold text-black mr-4">blockExplorer</h1>
        <div className="flex-grow mr-4">
          <input
            type="text"
            className="w-full border border-gray-300 text-black rounded px-4 py-2 focus:outline-none focus:border-blue-500"
            placeholder="Search"
            id="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchBlock(parseInt(search));
              }
            }}
          />
        </div>
        <select
          className="border border-gray-300 text-black rounded px-4 py-2 focus:outline-none focus:border-blue-500"
          value={Field}
          onChange={(e) => {
            setField(e.target.value);
          }}
        >
          <option value="blockNumber">BlockNumber</option>
          <option value="timeStamp">Time</option>
          <option value="gasUsed">GasUsed</option>
        </select>
        <select
          id="sortOrder"
          className="border border-gray-300 text-black rounded px-4 ml-1 py-2 focus:outline-none focus:border-blue-500"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
          }}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div className="flex items-center bg-transparent rounded-lg m-2 p-4">
        <div className="flex-grow mr-4">
          <button
            className="text-red-500 hover:text-red-700 focus:outline-none"
            onClick={() => handleDeleteAllBlock()}
          >
            Delete All
          </button>
        </div>
        Total Transactions: {""}
        {totalTransactions}
      </div>

      {loading ? (
        <div className="flex min-h-screen  flex-col items-center justify-between p-10 ">
          <p>Loading...</p>{" "}
        </div>
      ) : (
        <main className="flex min-h-screen  flex-col items-center justify-between p-10">
          <table className="bg-gray-200 ml-4 mr-4  rounded-lg text-black border-collapse">
            <thead>
              <tr>
                <th className="p-4">Block Number</th>
                <th className="p-4">Block Hash</th>
                <th className="p-4">Time Stamp</th>
                <th className="p-4">Gas used</th>
                <th className="p-4">Nonce</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {blockResult.map((block, index) => {
                const isTimestampToggled = toggleTimestamps[index] ?? false;

                return (
                  <>
                    <tr
                      className="border border-gray-300"
                      style={{ cursor: "pointer" }}
                    >
                      <td className="p-4 "> {block.blockDetails.number}</td>
                      <td className="p-4">
                       
                        {
                          offlineMode ? block.blockDetails.blockHash : block.blockDetails.hash
                        }
                      </td>
                      <td
                        className="p-4"
                        onClick={() =>
                          handleToggleFieldFormat(index, "timestamp")
                        }
                      >
                        {" "}
                        {isTimestampToggled
                          ? new Date(
                              block.blockDetails.timestamp * 1000
                            ).toLocaleString()
                          : block.blockDetails.timestamp}{" "}
                      </td>
                      <td className="p-4">
                        {" "}
                        {`${ethers.utils.formatUnits(
                          block.blockDetails.gasUsed,
                          "wei"
                        )} WEI`}
                      </td>
                      <td
                        className="p-4"
                        onClick={() => handleToggleFieldFormat(index, "nonce")}
                      >
                        {toggleNonces[index]
                          ? ethers.BigNumber.from(
                              block.blockDetails.nonce
                            ).toHexString()
                          : Number(block.blockDetails.nonce)}
                      </td>
                      <td className="p-4">
                        <button
                          className="text-red-500 hover:text-red-700 focus:outline-none"
                          onClick={() =>
                            handleDeleteBlock(block.blockDetails.number)
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-6 h-6"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M16 3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12zm-3 7a1 1 0 0 0-1-1H8a1 1 0 1 0 0 2h4a1 1 0 0 0 1-1zm-9-3a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V7zm4 0a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V7zm4 0a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V7z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </main>
      )}
    </>
  );
}
