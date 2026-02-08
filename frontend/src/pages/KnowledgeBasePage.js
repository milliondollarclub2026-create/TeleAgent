import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText,
  Loader2,
  Upload,
  FileSpreadsheet,
  Image,
  File,
  Search,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FILE_ICONS = {
  pdf: FileText,
  docx: FileText,
  spreadsheet: FileSpreadsheet,
  image: Image,
  text: File
};

const FILE_TYPE_LABELS = {
  pdf: 'PDF Document',
  docx: 'Word Document',
  spreadsheet: 'Spreadsheet',
  image: 'Image',
  text: 'Text'
};

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const addDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    setAddingDoc(true);
    try {
      const response = await axios.post(`${API}/documents`, newDoc);
      toast.success(`Document added with ${response.data.chunk_count} searchable chunks`);
      setNewDoc({ title: '', content: '' });
      setDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to add document');
    } finally {
      setAddingDoc(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, Excel, CSV, TXT, or image files.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(30);
      
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 50) / progressEvent.total);
          setUploadProgress(30 + progress);
        }
      });

      setUploadProgress(100);
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">File uploaded successfully!</span>
          <span className="text-sm text-slate-500">
            {response.data.chunk_count} searchable chunks created
          </span>
        </div>
      );
      
      fetchDocuments();
      setDialogOpen(false);
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to upload file';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const searchDocuments = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setSearching(true);
    try {
      const response = await axios.post(`${API}/documents/search`, null, {
        params: { query: searchQuery, top_k: 5 }
      });
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const FileIcon = ({ type }) => {
    const Icon = FILE_ICONS[type] || File;
    const colors = {
      pdf: 'bg-red-100 text-red-600',
      docx: 'bg-blue-100 text-blue-600',
      spreadsheet: 'bg-green-100 text-green-600',
      image: 'bg-purple-100 text-purple-600',
      text: 'bg-emerald-100 text-emerald-600'
    };
    
    return (
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[type] || colors.text}`}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" data-testid="knowledge-base-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload documents to help your AI understand your business</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-document-btn">
              <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-slate-900">Add to Knowledge Base</DialogTitle>
              <DialogDescription className="text-slate-500">
                Upload files or paste text to train your AI agent
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4 pt-4">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  {uploading ? (
                    <div className="space-y-4">
                      <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-600" strokeWidth={1.5} />
                      <div>
                        <p className="font-medium text-slate-900">Processing file...</p>
                        <p className="text-sm text-slate-500 mt-1">Creating searchable chunks with AI embeddings</p>
                      </div>
                      <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-slate-400" strokeWidth={1.5} />
                      <div className="mt-4">
                        <p className="font-medium text-slate-900">Drop file here or click to browse</p>
                        <p className="text-sm text-slate-500 mt-1">
                          PDF, DOCX, Excel, CSV, TXT, or Images (max 10MB)
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
                        data-testid="file-upload-input"
                      />
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-5 gap-3 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 text-red-500" strokeWidth={1.75} />
                    <span>PDF</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 text-blue-500" strokeWidth={1.75} />
                    <span>DOCX</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" strokeWidth={1.75} />
                    <span>Excel/CSV</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Image className="w-5 h-5 text-purple-500" strokeWidth={1.75} />
                    <span>Images</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <File className="w-5 h-5 text-slate-500" strokeWidth={1.75} />
                    <span>TXT</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="docTitle" className="text-slate-700 text-sm">Document Title</Label>
                  <Input
                    id="docTitle"
                    placeholder="e.g., Product Catalog, Pricing Guide, FAQ"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                    className="h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    data-testid="doc-title-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="docContent" className="text-slate-700 text-sm">Content</Label>
                  <Textarea
                    id="docContent"
                    placeholder="Enter your document content here. Include product details, pricing, policies, FAQs, etc."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                    rows={10}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                    data-testid="doc-content-input"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={addDocument}
                    disabled={addingDoc}
                    data-testid="save-document-btn"
                  >
                    {addingDoc && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}
                    Save Document
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
              <Input
                placeholder="Test your knowledge base... e.g., 'What is the price of iPhone 15?'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchDocuments()}
                className="pl-9 h-9 border-slate-200 focus:border-emerald-500"
                data-testid="search-input"
              />
            </div>
            <Button 
              size="sm"
              variant="outline"
              onClick={searchDocuments}
              disabled={searching}
              data-testid="search-btn"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <Search className="w-4 h-4" strokeWidth={1.75} />
              )}
            </Button>
          </div>
          
          {searchResults && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Search Results ({searchResults.results?.length || 0} matches from {searchResults.total_chunks_searched} chunks)
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-slate-500"
                  onClick={() => setSearchResults(null)}
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </Button>
              </div>
              
              {searchResults.results?.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.results.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                        <span className="text-xs text-slate-500">{result.source}</span>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-3">{result.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-400" strokeWidth={1.5} />
                  <p className="text-sm text-slate-500 mt-2">No relevant content found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">No Documents Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Upload product catalogs, pricing guides, FAQs, or any documents to train your AI agent.
            </p>
            <Button 
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setDialogOpen(true)} 
              data-testid="add-first-document-btn"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
              Add Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card 
              key={doc.id} 
              className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" 
              data-testid={`document-${doc.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileIcon type={doc.file_type} />
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm">{doc.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {FILE_TYPE_LABELS[doc.file_type] || 'Document'}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-emerald-600 font-medium">
                          {doc.chunk_count || 1} chunks
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteDocument(doc.id)}
                    data-testid={`delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* RAG Info Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-slate-50 border-emerald-100 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Semantic Search Powered by AI</h3>
              <p className="text-sm text-slate-600 mt-1">
                Your documents are automatically chunked and embedded using OpenAI. When customers ask questions, 
                the AI finds the most relevant information using semantic understanding - not just keyword matching.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs bg-white">Product Catalogs</Badge>
                <Badge variant="outline" className="text-xs bg-white">Pricing Guides</Badge>
                <Badge variant="outline" className="text-xs bg-white">FAQs</Badge>
                <Badge variant="outline" className="text-xs bg-white">Policies</Badge>
                <Badge variant="outline" className="text-xs bg-white">Product Images</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBasePage;
