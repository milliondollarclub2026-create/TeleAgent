import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
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
  Shield,
  ScrollText,
  Package,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });
  const [isPolicyDoc, setIsPolicyDoc] = useState(false);
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
      const docData = {
        ...newDoc,
        category: isPolicyDoc ? 'policy' : 'knowledge'
      };
      await axios.post(`${API}/documents`, docData);
      toast.success('Document added successfully');
      setNewDoc({ title: '', content: '' });
      setIsPolicyDoc(false);
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

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
      toast.error('Unsupported file type');
      return;
    }

    setUploading(true);
    setUploadComplete(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', isPolicyDoc ? 'policy' : 'knowledge');

    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadComplete(true);

      // Show success state briefly, then close
      setTimeout(() => {
        toast.success('Document uploaded successfully');
        fetchDocuments();
        setDialogOpen(false);
        setIsPolicyDoc(false);
        setUploading(false);
        setUploadComplete(false);
      }, 1500);

    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to upload file';
      toast.error(errorMsg);
      setUploading(false);
      setUploadComplete(false);
    } finally {
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFileTypeLabel = (type) => {
    const labels = { pdf: 'PDF', docx: 'Word', spreadsheet: 'Excel', image: 'Image', text: 'Text' };
    return labels[type] || 'File';
  };

  // Split documents by category
  const knowledgeDocs = documents.filter(doc => doc.category !== 'policy');
  const policyDocs = documents.filter(doc => doc.category === 'policy');

  // Empty State Component
  const EmptyState = ({ type }) => {
    const isPolicy = type === 'policy';
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          {isPolicy ? (
            <Shield className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
          ) : (
            <Package className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
          )}
        </div>
        <h3 className="font-medium text-slate-900 text-sm mb-1">
          {isPolicy ? 'No Policies Yet' : 'No Documents Yet'}
        </h3>
        <p className="text-xs text-slate-500 max-w-[180px]">
          {isPolicy
            ? 'Add return policy, terms of service, etc.'
            : 'Upload product info, FAQs, or guides'
          }
        </p>
      </div>
    );
  };

  // Document Row Component
  const DocumentRow = ({ doc }) => (
    <div className="group flex items-center justify-between py-3 px-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-slate-900 text-sm truncate">{doc.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{getFileTypeLabel(doc.file_type)}</span>
            {doc.file_size && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
              </>
            )}
            {doc.category === 'policy' && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Policy</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this document?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{doc.title}" from your knowledge base.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteDocument(doc.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="knowledge-base-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Knowledge Base</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Upload documents to help your AI understand your business</p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
          onClick={() => setDialogOpen(true)}
          data-testid="add-document-btn"
        >
          <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
          Add Document
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!uploading) {
          setDialogOpen(open);
          if (!open) {
            setIsPolicyDoc(false);
            setUploadComplete(false);
          }
        }
      }}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold text-slate-900">Add Document</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-slate-100">
                <TabsTrigger value="upload" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="text" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Paste Text
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="mt-0 focus-visible:ring-0">
              <div className="px-6 py-5 space-y-5">
                {/* Category Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">This is a policy document</p>
                      <p className="text-xs text-slate-500">Return policy, terms, privacy, etc.</p>
                    </div>
                  </div>
                  <Switch
                    checked={isPolicyDoc}
                    onCheckedChange={setIsPolicyDoc}
                    disabled={uploading}
                  />
                </div>

                {/* Upload Zone */}
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-all ${
                    uploading
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  {uploading ? (
                    <div className="py-14 px-6 text-center">
                      {uploadComplete ? (
                        <>
                          <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2} />
                          </div>
                          <p className="font-medium text-slate-900">Upload Complete</p>
                          <p className="text-sm text-slate-500 mt-1">Your document is ready</p>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 relative">
                            <div className="absolute inset-0 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin"></div>
                            <FileText className="w-6 h-6 text-slate-500" strokeWidth={1.75} />
                          </div>
                          <p className="font-medium text-slate-900">Processing document...</p>
                          <p className="text-sm text-slate-500 mt-1">This may take a moment</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 px-6 text-center">
                      <Upload className="w-10 h-10 mx-auto text-slate-400" strokeWidth={1.5} />
                      <p className="font-medium text-slate-900 mt-4">Drop file here or click to browse</p>
                      <p className="text-sm text-slate-500 mt-1">Maximum file size: 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
                        data-testid="file-upload-input"
                      />
                    </div>
                  )}
                </div>

                {/* Supported File Types - Elegant inline display */}
                {!uploading && (
                  <div className="pt-2 pb-1">
                    <div className="flex items-center justify-center gap-6 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                        PDF
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Word
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Excel
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Images
                      </span>
                      <span className="flex items-center gap-1.5">
                        <File className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Text
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-0 focus-visible:ring-0">
              <div className="px-6 py-5 space-y-4 min-h-[420px]">
                {/* Category Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">This is a policy document</p>
                      <p className="text-xs text-slate-500">Return policy, terms, privacy, etc.</p>
                    </div>
                  </div>
                  <Switch
                    checked={isPolicyDoc}
                    onCheckedChange={setIsPolicyDoc}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Title</Label>
                  <Input
                    placeholder={isPolicyDoc ? "e.g., Return Policy" : "e.g., Product Catalog"}
                    value={newDoc.title}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                    className="h-10 border-slate-200"
                    data-testid="doc-title-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Content</Label>
                  <Textarea
                    placeholder={isPolicyDoc
                      ? "Paste your policy text here..."
                      : "Paste product details, FAQs, guides, etc."
                    }
                    value={newDoc.content}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    className="border-slate-200 resize-none"
                    data-testid="doc-content-input"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-9 border-slate-200"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-9 bg-slate-900 hover:bg-slate-800"
                    onClick={addDocument}
                    disabled={addingDoc}
                    data-testid="save-document-btn"
                  >
                    {addingDoc && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}
                    Save Document
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Business Knowledge Section */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">Business Knowledge</h2>
                <p className="text-xs text-slate-500">Products, FAQs, guides</p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setIsPolicyDoc(false);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
              Add
            </Button>
          </div>

          {knowledgeDocs.length === 0 ? (
            <EmptyState type="knowledge" />
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {knowledgeDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </Card>

        {/* Terms & Policies Section */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">Terms & Policies</h2>
                <p className="text-xs text-slate-500">Return policy, terms of service</p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setIsPolicyDoc(true);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
              Add
            </Button>
          </div>

          {policyDocs.length === 0 ? (
            <EmptyState type="policy" />
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {policyDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Info Section */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <ScrollText className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-medium text-slate-900 text-sm">How Knowledge Base Works</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Your documents are processed and understood by AI. When customers ask questions,
            your agent searches for relevant information and provides accurate answers based on your content.
          </p>
        </div>
      </div>

      {/* All Documents Section */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">All Documents</h3>
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
