import { useEffect, useState } from "react"
import type { FileData, SelectedFile } from "../lib/types"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import { ChevronDown, ChevronRight, File, Plus } from "lucide-react"
import { useSqlContext } from "./SqlContext"
import type { ParamsObject } from "sql.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import { deleteAssetFromIndexedDB, saveAssetToIndexedDB } from "@/lib/idbHelper"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "./ui/context-menu"
import { ContextMenuItem } from "@radix-ui/react-context-menu"

export function FileList<T>({
  type,
  selectedFile,
  setSelectedFile,
}: {
  type: "template" | "content" | "asset"
  selectedFile: SelectedFile
  setSelectedFile: React.Dispatch<React.SetStateAction<SelectedFile>>
}) {
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [files, setFiles] = useState<FileData[]>([])
  const [contextMenuFile, setContextMenuFile] = useState<string>("")

  const { execute, loading, error, schemaInitialized } = useSqlContext()

  useEffect(() => {
    if (!schemaInitialized || loading || error) return
    const fetchData = async () => {
      try {
        const query =
          type === "template"
            ? "SELECT * FROM files WHERE type IN ('css', 'hbs');"
            : type === "content"
              ? "SELECT * FROM files WHERE type = 'md';"
              : "SELECT * FROM files WHERE type = 'asset';"
        const result = execute(query)
        const files = result.map((file: ParamsObject) => ({
          name: file.name?.toString() || "",
          content: file.content?.toString() || "",
          type: file.type?.toString() as FileData["type"],
        }))
        console.log("Result from SQL.js:", result)
        setFiles(files)
      } catch (err) {
        console.error("Error fetching data:", err)
      }
    }

    fetchData()
  }, [execute, loading, error, schemaInitialized, selectedFile])

  if (loading || !schemaInitialized) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const handleAddFile = (type: "template" | "content" | "asset") => {
    if (!schemaInitialized || loading || error) return
    const fileExtension = type === "template" ? "hbs" : "md"

    // Function to generate unique filename
    const generateUniqueFileName = (
      baseName: string,
      files: FileData[],
      extension: string
    ) => {
      let fileName = `${baseName}.${extension}`
      let counter = 1

      // Check if file with this name already exists
      while (files.some(file => file.name === fileName)) {
        fileName = `${baseName}${counter}.${extension}`
        counter++
      }

      return fileName
    }

    const newFileName = generateUniqueFileName("newfile", files, fileExtension)

    execute(
      "INSERT OR IGNORE INTO files (name, type, content) VALUES (?, ?, ?);",
      [newFileName, fileExtension, ""]
    )
    setFiles([
      ...files,
      { name: newFileName, type: fileExtension, content: "" },
    ])
  }

  // Create object URLs for image assets
  // useEffect(() => {
  //   const urls: Record<string, string> = {}

  //   assets.forEach(asset => {
  //     // Adjust the MIME type based on your requirements
  //     if (asset.name.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
  //       urls[asset.name] = URL.createObjectURL(
  //         new Blob([asset.content], { type: "image/*" })
  //       )
  //     }
  //   })

  //   setImageURLs(urls)

  //   // Cleanup: Revoke object URLs when assets change or component unmounts
  //   return () => {
  //     Object.values(urls).forEach(url => URL.revokeObjectURL(url))
  //   }
  // }, [assets])

  const handleUploadFile = async (type: "template" | "content" | "asset") => {
    if (!schemaInitialized || loading || error) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept =
      type === "template" ? ".html,.htm,.hbs" : type === "content" ? ".md" : "*"
    const normalizedType =
      type === "template" ? "hbs" : type === "asset" ? "asset" : "md"
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const content =
          type === "asset" ? await file.arrayBuffer() : await file.text()
        const newFile = { name: file.name, content }

        if (type === "asset" && file.name.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
          const url = URL.createObjectURL(
            new Blob([content], { type: "image/*" })
          )

          execute(
            "INSERT OR IGNORE INTO files (name, type, content) VALUES (?, ?, ?);",
            [file.name, normalizedType, url]
          )
        } else {
          execute(
            "INSERT OR IGNORE INTO files (name, type, content) VALUES (?, ?, ?);",
            [file.name, normalizedType, content as string]
          )
        }

        setFiles([...files, newFile] as FileData<string>[])
        setSelectedFile({
          activeFile: file.name,
          type: normalizedType,
          contentFile:
            type === "content" ? file.name : selectedFile.contentFile,
        })

        // insert into IndexedDB
        if (type === "asset") {
          saveAssetToIndexedDB(file.name, new Blob([content]))
        }
      }
    }
    input.click()
  }

  // const handleRemoveAsset = (fileName: string) => {
  //   setAssets(prevAssets => prevAssets.filter(file => file.name !== fileName))
  //   setImageURLs(prevURLs => {
  //     const { [fileName]: _, ...rest } = prevURLs
  //     URL.revokeObjectURL(_)
  //     return rest
  //   })
  // }

  const handleContextMenu = (e: React.MouseEvent<HTMLLIElement>) => {
    // e.preventDefault() // Prevent the default right-click menu
    const fileName = e.currentTarget.textContent || ""
    setContextMenuFile(fileName) // Store the clicked file's name
    // Logic to show the custom context menu
  }

  const handleRenameFile = (oldName: string, newName: string) => {
    if (!schemaInitialized || loading || error) return
    execute("UPDATE files SET name = ? WHERE name = ?;", [newName, oldName])
    setFiles(files =>
      files.map(file =>
        file.name === oldName ? { ...file, name: newName } : file
      )
    )
    if (selectedFile.activeFile === oldName) {
      setSelectedFile(selectedFile => ({
        activeFile: newName,
        type: selectedFile.type,
        contentFile: selectedFile.contentFile,
      }))
    }
  }

  const handleRenameFileClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const newName = prompt("Enter new name:", contextMenuFile as string)
    if (newName) {
      handleRenameFile(contextMenuFile as string, newName)
    }
  }

  const handleDeleteFile = (fileName: string) => {
    if (!schemaInitialized || loading || error) return
    execute("DELETE FROM files WHERE name = ?;", [fileName])
    setFiles(files => files.filter(file => file.name !== fileName))
    if (selectedFile.activeFile === fileName) {
      setSelectedFile(selectedFile => ({
        activeFile: "",
        type: selectedFile.type,
        contentFile: selectedFile.contentFile,
      }))
    }
    if (type === "asset") {
      deleteAssetFromIndexedDB(fileName)
    }
  }

  const handleDeleteFileClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (confirm(`Are you sure you want to delete ${contextMenuFile}?`)) {
      handleDeleteFile(contextMenuFile as string)
    }
  }

  const heading =
    type === "template"
      ? "Templates"
      : type === "content"
        ? "Content"
        : "Assets"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[200px]">
      <div className="flex w-full items-center justify-between p-4 pr-2 font-semibold">
        <CollapsibleTrigger>{heading}</CollapsibleTrigger>
        <div className="flex items-center space-x-2">
          <CollapsibleTrigger>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {type === "asset" ? null : (
                <DropdownMenuItem onClick={() => handleAddFile(type)}>
                  New File
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleUploadFile(type)}>
                Upload File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CollapsibleContent>
        <ul className="p-4">
          {files.map(file => (
            <ContextMenu key={file.name}>
              <ContextMenuTrigger>
                <li
                  onContextMenu={handleContextMenu}
                  className={`flex cursor-pointer items-center gap-2 rounded p-2 ${
                    selectedFile.activeFile === file.name
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() =>
                    setSelectedFile(selectedFile => ({
                      activeFile: file.name,
                      type: file.type,
                      contentFile:
                        file.type === "md"
                          ? file.name
                          : selectedFile.contentFile,
                    }))
                  }>
                  <File className="h-4 w-4" />
                  {/* {file.name.length > 12
                    ? file.name.slice(0, 12) + "..."
                    : file.name} */}
                  {file.name}
                </li>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  className="flex text-sm cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-accent hover:outline-none"
                  onClick={handleRenameFileClick}>
                  Rename
                </ContextMenuItem>
                <ContextMenuItem
                  className="flex text-sm cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-accent hover:outline-none"
                  onClick={handleDeleteFileClick}>
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
