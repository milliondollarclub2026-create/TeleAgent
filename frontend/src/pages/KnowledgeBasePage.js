import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText,
  Loader2
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingDoc, setAddingDoc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });

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
      await axios.post(`${API}/documents`, newDoc);
      toast.success('Document added successfully');
      setNewDoc({ title: '', content: '' });
      setDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to add document');
    } finally {
      setAddingDoc(false);
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
          <p className="text-slate-500 text-sm mt-0.5">Add documents to help your AI understand your business</p>
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
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-slate-900">Add Document</DialogTitle>
              <DialogDescription className="text-slate-500">
                Add knowledge that your AI agent can reference during conversations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">No Documents Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Add documents like product catalogs, pricing guides, and FAQs to help your AI agent provide accurate information.
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
            <Card key={doc.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`document-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm">{doc.title}</h3>
                      <p className="text-xs text-slate-500">
                        {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Text document'} • 
                        Added {new Date(doc.created_at).toLocaleDateString()}
                      </p>
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
    </div>
  );
};

export default KnowledgeBasePage;
