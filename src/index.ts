import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises"
import * as path from "path"
import { fileURLToPath } from "url";
import { config } from "process";

const server = new McpServer({
    name: "my-mcp",
    version:"1.0.0",
})

server.registerTool(
    "add-numbers",
    {
        inputSchema:{
             a:z.number().describe("first number"),
             b:z.number().describe("second number")
        }
       
    },
    ({a,b})=>{
        return {
            content: [{type:"text",text:`total is ${a+b}`}],
        };
    }
)

server.registerTool(
    "get_github_repos",
    {
        inputSchema:{
            username:z.string().describe("Github username")
        }
    },
    async({username})=>{
        const res = await fetch(`https://api.github.com/users/${username}/repos`,
            {
            headers: {"User-Agent": "MCP Agent"}
            }
        )
        if(!res.ok) throw new Error("Github API error");
        const repos = await res.json();
        
        const repolist = repos.map((repo:any,i:number)=>`${i+1}. ${repo.name}`).join("\n\n");

        return {
            content: [{type:"text", text:  `github repo for ${username}: (${repos.length} repos): \n\n ${repolist}`}]
        }
    }
)

server.registerResource(
    "apartment-rules",
    "rules://all",{
        description:"My resource document for all rules",
        mimeType:"text/plain",
    },
    async (url)=>{
        const urlString = url.toString()
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename)
        const rules = await fs.readFile(
            path.resolve(__dirname, "../src/data/rules.doc"),
            "utf-8"
        )

        return {
            contents: [
                {
                    uri: urlString,
                    mimeType: "text/plain",
                    text: rules,
                },
            ],
        }
    }

)

server.registerPrompt(
    "explain-sql",
    {
    description:"explain the given SQL query",
    argsSchema:{
        sql:z.string().describe("The sql query to explain")
    },
},
    ({sql})=>{
        return{
            messages:[
                {
                    role:"user",
                    content:{
                        type:"text",
                        text:`Give me a detailed explanation of the following sql query in plain English: ${sql} Make it very detailed and specific for a beginer to understand`
                    }
                }
            ]
        }
    }
)

async function main(){
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err)=>{
    console.error("Error in main: ",err);
    process.exit(1)
})