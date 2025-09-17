import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { useState } from "react";

export default function FileDrop() {
  const [files, setFiles] = useState<File[] | undefined>();
  const [uploading, setUploading] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setDownloadLink(null);
    setStatusMessage(null);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setStatusMessage("⚠️ Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", files[0]);

    try {
      setUploading(true);
      setStatusMessage("⏳ Uploading...");

      const res = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.downloadLink) {
        setDownloadLink(data.downloadLink);
        setStatusMessage("✅ Uploaded successfully!");
      } else {
        setStatusMessage("⚠️ Upload completed but no link received.");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setStatusMessage("❌ Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-md mx-auto border rounded-2xl shadow-sm bg-white">
      <Dropzone
        accept={{ "image/*": [] }}
        maxFiles={1}
        maxSize={1024 * 1024 * 10} // 10MB
        minSize={1024}
        onDrop={handleDrop}
        onError={console.error}
        src={files}
      >
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>

      {files && files.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <img
              src={URL.createObjectURL(files[0])}
              alt="preview"
              className="w-12 h-12 object-cover rounded-lg border"
            />
            <div>
              <p className="text-sm font-medium">{files[0].name}</p>
              <p className="text-xs text-gray-500">
                {(files[0].size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {statusMessage && (
        <p
          className={`text-sm ${
            statusMessage.startsWith("✅")
              ? "text-green-600"
              : statusMessage.startsWith("❌")
              ? "text-red-600"
              : "text-gray-600"
          }`}
        >
          {statusMessage}
        </p>
      )}

      {downloadLink && (
        <a
          href={downloadLink}
          className="px-4 py-2 bg-green-500 text-white rounded-lg mt-4 inline-block text-center hover:bg-green-600 transition"
        >
          ⬇ Download ZIP
        </a>
      )}
    </div>
  );
}
