import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import {
  Plus,
  Trash2,
  FileText,
  Loader2,
  Upload,
  FileSpreadsheet,
  Image,
  File,
  Shield,
  Package,
  CheckCircle2,
  Pencil,
  ImagePlus,
  X,
  ChevronDown,
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
  const [globalDocs, setGlobalDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });
  const [isPolicyDoc, setIsPolicyDoc] = useState(false);
  const [togglingDoc, setTogglingDoc] = useState(null);
  const fileInputRef = useRef(null);

  // Media Library state
  const [mediaItems, setMediaItems] = useState([]);
  const [imageResponsesEnabled, setImageResponsesEnabled] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);
  const [mediaLimit, setMediaLimit] = useState(50);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editMediaDialogOpen, setEditMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [newMedia, setNewMedia] = useState({ name: '', description: '', tags: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const mediaFileInputRef = useRef(null);
  const [togglingImageResponses, setTogglingImageResponses] = useState(false);

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // Toggle image responses setting
  const toggleImageResponses = async () => {
    setTogglingImageResponses(true);
    const newValue = !imageResponsesEnabled;
    try {
      await axios.put(`${API}/config`, { image_responses_enabled: newValue });
      setImageResponsesEnabled(newValue);
      toast.success(newValue ? 'Product media enabled' : 'Product media disabled');
    } catch (error) {
      console.error('Failed to toggle image responses:', error);
      toast.error('Failed to update setting');
    } finally {
      setTogglingImageResponses(false);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      const [localRes, globalRes, mediaRes] = await Promise.all([
        axios.get(`${API}/documents`),
        axios.get(`${API}/documents/global/settings`),
        axios.get(`${API}/media`).catch(() => ({ data: { media: [], count: 0, limit: 50, image_responses_enabled: false } }))
      ]);
      setDocuments(localRes.data);
      setGlobalDocs(globalRes.data);

      // Set media data
      if (mediaRes.data) {
        setMediaItems(mediaRes.data.media || []);
        setMediaCount(mediaRes.data.count || 0);
        setMediaLimit(mediaRes.data.limit || 50);
        setImageResponsesEnabled(mediaRes.data.image_responses_enabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalDoc = async (docId, currentEnabled) => {
    setTogglingDoc(docId);
    try {
      await axios.put(`${API}/documents/global/${docId}/toggle?enabled=${!currentEnabled}`);
      setGlobalDocs(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, is_enabled: !currentEnabled } : doc
      ));
      toast.success(currentEnabled ? 'Document disabled for this agent' : 'Document enabled for this agent');
    } catch (error) {
      console.error('Failed to toggle document:', error);
      toast.error('Failed to update document settings');
    } finally {
      setTogglingDoc(null);
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
      fetchAllDocuments();
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

      setTimeout(() => {
        toast.success('Document uploaded successfully');
        fetchAllDocuments();
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
      fetchAllDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  // Media handling functions
  const handleMediaFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPG, GIF, or WebP');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-generate name from filename
    const nameFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    setNewMedia(prev => ({ ...prev, name: nameFromFile }));
  };

  const handleMediaUpload = async () => {
    if (!selectedFile || !newMedia.name.trim()) {
      toast.error('Please select a file and enter a name');
      return;
    }

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', newMedia.name.trim());
    formData.append('description', newMedia.description || '');
    formData.append('tags', newMedia.tags || '');

    try {
      await axios.post(`${API}/media/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Media uploaded successfully');
      resetMediaDialog();
      fetchAllDocuments();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to upload media';
      toast.error(errorMsg);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaEdit = async () => {
    if (!selectedMedia || !newMedia.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSavingMedia(true);
    try {
      await axios.put(`${API}/media/${selectedMedia.id}`, {
        name: newMedia.name.trim(),
        description: newMedia.description || null,
        tags: newMedia.tags ? newMedia.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      });
      toast.success('Media updated successfully');
      setEditMediaDialogOpen(false);
      setSelectedMedia(null);
      fetchAllDocuments();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to update media';
      toast.error(errorMsg);
    } finally {
      setSavingMedia(false);
    }
  };

  const handleMediaDelete = async (mediaId) => {
    try {
      await axios.delete(`${API}/media/${mediaId}`);
      toast.success('Media deleted');
      fetchAllDocuments();
    } catch (error) {
      toast.error('Failed to delete media');
    }
  };

  const openEditMediaDialog = (media) => {
    setSelectedMedia(media);
    setNewMedia({
      name: media.name || '',
      description: media.description || '',
      tags: (media.tags || []).join(', ')
    });
    setEditMediaDialogOpen(true);
  };

  const resetMediaDialog = () => {
    setMediaDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setNewMedia({ name: '', description: '', tags: '' });
    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = '';
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

  // Combine all documents for the unified list
  const allDocuments = [
    ...globalDocs.map(doc => ({ ...doc, isGlobal: true })),
    ...documents.map(doc => ({ ...doc, isGlobal: false }))
  ];

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

  // Document Row Component (for local documents)
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

  // Unified Document Row for All Documents section (supports both local and global)
  const UnifiedDocumentRow = ({ doc }) => {
    const isGlobal = doc.isGlobal;

    return (
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
              {isGlobal && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-medium">Global</span>
                </>
              )}
              {!isGlobal && doc.category === 'policy' && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">Policy</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGlobal ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${doc.is_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {doc.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={doc.is_enabled}
                onCheckedChange={() => toggleGlobalDoc(doc.id, doc.is_enabled)}
                disabled={togglingDoc === doc.id}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  };

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agent Knowledge Base</h1>
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

                {/* Supported File Types */}
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

      {/* Media Upload Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={(open) => {
        if (!uploadingMedia) {
          if (!open) resetMediaDialog();
          else setMediaDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Image className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              Add Media
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {!selectedFile ? (
              /* Drop Zone */
              <div
                className="relative rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => mediaFileInputRef.current?.click()}
              >
                <div className="py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <ImagePlus className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <p className="font-medium text-slate-900">Drop image here or click to browse</p>
                  <p className="text-sm text-slate-500 mt-1">PNG, JPG, WebP up to 5MB</p>
                </div>
                <input
                  ref={mediaFileInputRef}
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleMediaFileSelect}
                  accept=".png,.jpg,.jpeg,.gif,.webp"
                />
              </div>
            ) : (
              /* Preview and Form */
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative">
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setNewMedia({ name: '', description: '', tags: '' });
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., chocolate_cake"
                    value={newMedia.name}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10 border-slate-200 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400">Used by AI to reference this image</p>
                </div>

                {/* Description Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Description</Label>
                  <Textarea
                    placeholder="Describe this image for the AI..."
                    value={newMedia.description}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="border-slate-200 resize-none text-sm"
                  />
                </div>

                {/* Tags Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Tags</Label>
                  <Input
                    placeholder="best seller, chocolate, premium"
                    value={newMedia.tags}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, tags: e.target.value }))}
                    className="h-10 border-slate-200 text-sm"
                  />
                  <p className="text-xs text-slate-400">Comma-separated tags (optional)</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="h-9 border-slate-200"
                onClick={resetMediaDialog}
                disabled={uploadingMedia}
              >
                Cancel
              </Button>
              <Button
                className="h-9 bg-slate-900 hover:bg-slate-800"
                onClick={handleMediaUpload}
                disabled={uploadingMedia || !selectedFile || !newMedia.name.trim()}
              >
                {uploadingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" strokeWidth={2} />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Media Dialog */}
      <Dialog open={editMediaDialogOpen} onOpenChange={(open) => {
        if (!savingMedia) {
          setEditMediaDialogOpen(open);
          if (!open) setSelectedMedia(null);
        }
      }}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              Edit Media
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {selectedMedia && (
              <>
                {/* Image Preview */}
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={selectedMedia.public_url}
                    alt={selectedMedia.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newMedia.name}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10 border-slate-200 font-mono text-sm"
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Description</Label>
                  <Textarea
                    placeholder="Describe this image for the AI..."
                    value={newMedia.description}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="border-slate-200 resize-none text-sm"
                  />
                </div>

                {/* Tags Input */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-sm font-medium">Tags</Label>
                  <Input
                    placeholder="best seller, chocolate, premium"
                    value={newMedia.tags}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, tags: e.target.value }))}
                    className="h-10 border-slate-200 text-sm"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="h-9 border-slate-200"
                onClick={() => setEditMediaDialogOpen(false)}
                disabled={savingMedia}
              >
                Cancel
              </Button>
              <Button
                className="h-9 bg-slate-900 hover:bg-slate-800"
                onClick={handleMediaEdit}
                disabled={savingMedia || !newMedia.name.trim()}
              >
                {savingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two Column Layout for Categories */}
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
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
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
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
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

      {/* Product Media Section - Collapsible with local toggle */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        {/* Header - Always visible */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => !togglingImageResponses && toggleImageResponses()}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Image className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 text-sm">Product Media</h2>
                {mediaCount > 0 && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                    {mediaCount}/{mediaLimit}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {imageResponsesEnabled
                  ? 'Images your AI can show to customers'
                  : 'Enable to let your AI send product images'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {imageResponsesEnabled && (
              <Button
                size="sm"
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaDialogOpen(true);
                }}
                disabled={mediaCount >= mediaLimit}
              >
                <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                Add Media
              </Button>
            )}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={imageResponsesEnabled}
                onCheckedChange={toggleImageResponses}
                disabled={togglingImageResponses}
                className="data-[state=checked]:bg-emerald-600"
              />
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  imageResponsesEnabled ? 'rotate-180' : ''
                }`}
                strokeWidth={1.75}
              />
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {imageResponsesEnabled && (
          <div className="border-t border-slate-100">
            {mediaItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Image className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
                </div>
                <h3 className="font-medium text-slate-900 text-sm mb-1">No images yet</h3>
                <p className="text-xs text-slate-500 max-w-[220px] mb-4">
                  Add product images for your AI to share with customers
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => setMediaDialogOpen(true)}
                >
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                  Add your first image
                </Button>
              </div>
            ) : (
              /* Media Gallery Grid */
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mediaItems.map((media) => (
                    <div
                      key={media.id}
                      className="group relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all"
                    >
                      {/* Image */}
                      <div className="aspect-square">
                        <img
                          src={media.public_url}
                          alt={media.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditMediaDialog(media)}
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-red-600 flex items-center justify-center transition-colors">
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{media.name}" from your media library.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleMediaDelete(media.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Info */}
                      <div className="p-2 bg-white">
                        <p className="text-xs font-medium text-slate-900 truncate">{media.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {media.tags?.length > 0 ? `${media.tags.length} tag${media.tags.length > 1 ? 's' : ''}` : 'No tags'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add More Card */}
                  {mediaCount < mediaLimit && (
                    <button
                      onClick={() => setMediaDialogOpen(true)}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <Plus className="w-5 h-5" strokeWidth={1.5} />
                      <span className="text-xs font-medium">Add more</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* All Agent Documents Section */}
      {allDocuments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">All Agent Documents</h3>
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {allDocuments.map((doc) => (
                <UnifiedDocumentRow key={`${doc.isGlobal ? 'global' : 'local'}-${doc.id}`} doc={doc} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBasePage;
