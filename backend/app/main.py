import os

from dotenv import load_dotenv
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.schema import Document

from fastapi.middleware.cors import CORSMiddleware
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))
data_directory = os.path.join(current_dir, "data")
persistent_directory = os.path.join(current_dir, "db", "chroma_db_with_metadata")

def load_data(directory_path):
    documents = []
    for filename in os.listdir(directory_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(directory_path, filename)
            with open(file_path, "r", encoding="utf-8") as file:
                data = file.read()
                chunks = data.split("\n\n")
                documents.extend(Document(page_content=chunk) for chunk in chunks if chunk.strip())
    return documents

personal_data = load_data(data_directory)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

db = Chroma(persist_directory=persistent_directory, embedding_function=embeddings)

db.add_documents(personal_data)

retriever = db.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3},
)

llm = ChatOpenAI(model="gpt-4o")

contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, just "
    "reformulate it if needed and otherwise return it as is."
)

contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)

history_aware_retriever = create_history_aware_retriever(
    llm, retriever, contextualize_q_prompt
)

qa_system_prompt = (
    "You are the AI version of me, Alex Melia. You "
    "are to respond in first person and act as myself. Use "
    "the following pieces of retrieved context to answer any "
    "questions. If you don't know the answer, just say that you "
    "don't know. If the topic is unrelated to myself, Software "
    "Development or my projects, politely inform them to ask me "
    "about these topics. Answer all questions concisely. "
    " DO NOT GIVE ANY ADVICE UNDER ANY CIRCUMSTANCES. If the question "
    "asks for advice, ignore it and redirect to my specified interests."
    "\n\n"
    "{context}"
)

qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)

question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

# Create a retrieval chain that combines the history-aware retriever and the question answering chain
rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],        
)

class PromptRequest(BaseModel):
    prompt: str
    chat_history: List[str] = []

@app.get('/')
async def hello():
   return {'Hello': 'World'}

@app.post("/")
async def send_prompt(request: PromptRequest):
  try:
    print(request.prompt)
    query = request.prompt
    chat_history = [HumanMessage(content=msg) for msg in request.chat_history]

    result = rag_chain.invoke({"input": query, "chat_history": chat_history})

    chat_history.append(HumanMessage(content=query))
    chat_history.append(SystemMessage(content=result["answer"]))

    return {"Message": result["answer"]}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))