"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

interface Message {
  role: string
  content: string
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const newMessage: Message = { role: "user", content: prompt }
    setChatHistory((prevHistory) => [...prevHistory, newMessage])
    setPrompt("")
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          chat_history: chatHistory.map((message) => message.content),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMessage: Message = {
          role: "assistant",
          content: data.Message,
        }
        setLoading(false)
        setChatHistory((prevHistory) => [...prevHistory, assistantMessage])
      } else {
        setLoading(false)
        throw new Error(`${res.status}: ${res.statusText}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`${error.message || error.toString()}`)
      } else {
        toast.error(`An unknown error occurred`)
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: "I'm sorry, it appears there has been an error!",
      }
      setChatHistory((prevHistory) => [...prevHistory, assistantMessage])
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black/90 text-white">
      <div className="flex flex-col justify-between max-w-4xl w-full h-screen ">
        <div className="flex flex-col items-center gap-2 my-4">
          <img src="./me.jpg" alt="Me" className="w-32 rounded-lg" />
          <p className="text-xl font-bold">Alex Melia AI</p>
          <p className="text-sm font-light max-w-md text-center">
            This is an AI version of myself, trained on my own data. Go ahead,
            ask me anything!
          </p>
        </div>
        <div
          ref={chatContainerRef}
          className="flex flex-col overflow-y-auto p-2 h-full"
        >
          {chatHistory.length ? (
            chatHistory.map((message, index) => (
              <div key={index} className="p-2 flex gap-4">
                <img
                  src={message.role === "user" ? "./default.jpg" : "./me.jpg"}
                  className="w-12 h-12 rounded-lg"
                />

                <p
                  className={
                    message.role === "user"
                      ? " bg-blue-900 h-fit p-2 rounded-md"
                      : ""
                  }
                  style={{ whiteSpace: "pre-line" }}
                >
                  {message.content}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center w-full h-full mt-24 gap-1">
              <p className="font-bold text-2xl">
                You haven&apos;t asked anything yet!
              </p>
              <p className="font-light text-gray-200">
                Enter your message in the input field below
              </p>
            </div>
          )}
          {loading && (
            <div className="p-2 flex gap-4">
              <img src="./me.jpg" className="w-12 h-12 rounded-lg" />
              <p style={{ whiteSpace: "pre-line" }}>I&apos;m thinking...</p>
            </div>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center justify-between max-w-4xl w-full gap-2 p-4 text-black"
        >
          <input
            id="prompt"
            className="p-2 border rounded-md w-full"
            name="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your message..."
          />

          <button className="border w-fit mx-auto p-2 rounded-md text-white">
            Submit
          </button>
        </form>
      </div>
    </main>
  )
}
//
