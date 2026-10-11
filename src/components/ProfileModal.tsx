import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Shield, 
  Lock, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Check, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

export interface SupervisorProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarLetter: string;
  gradient: string;
  photoUrl?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisor: SupervisorProfile | null;
  onSave: (updated: SupervisorProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  supervisor,
  onSave,
}) => {
  const [formData, setFormData] = useState<SupervisorProfile | null>(null);
  const [imageError, setImageError] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (supervisor) {
      setFormData({ ...supervisor });
      setImageError(false);
    }
  }, [supervisor]);

  if (!isOpen || !formData) return null;

  const handleInputChange = (field: keyof SupervisorProfile, value: string) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : null);
    if (field === 'photoUrl') {
      setImageError(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => prev ? { ...prev, photoUrl: result } : null);
        setImageError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => prev ? { ...prev, photoUrl: '' } : null);
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('الرجاء إدخال الاسم');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200" 
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Banner */}
        <div className={`h-24 bg-gradient-to-r ${formData.gradient} relative px-6 flex items-end justify-between pb-3`}>
          <div className="text-white/90 font-medium text-xs flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
            <Shield size={13} />
            <span>ملف المشرف المعتمد</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/25 text-white hover:bg-black/40 flex items-center justify-center transition-colors shadow-xs"
            title="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-6 pt-0">
          {/* Avatar Preview Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 mb-6">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center relative">
                {formData.photoUrl && !imageError ? (
                  <img
                    src={formData.photoUrl}
                    alt={formData.name}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-r ${formData.gradient} flex items-center justify-center text-3xl font-black text-white`}>
                    {formData.avatarLetter}
                  </div>
                )}

                {/* Quick Camera Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition-opacity"
                  title="تغيير الصورة من الجهاز"
                >
                  <Camera size={20} className="mb-0.5" />
                  <span>تغيير</span>
                </button>
              </div>

              {formData.photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute bottom-0 right-0 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                  title="إزالة الصورة والعودة للحرف الرمزي"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="text-center sm:text-right flex-1">
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {formData.name || 'المهندس المشرف'}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  <Lock size={11} className="text-slate-400" />
                  {formData.role}
                </span>
                <span className="text-xs text-slate-400">CardioVision ERP</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Source Selection */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera size={14} className="text-slate-500" />
                  <span>تغيير الصورة الشخصية (Avatar)</span>
                </label>

                {/* Sub tabs */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('url')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeImageTab === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    رابط URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('upload')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeImageTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    رفع ملف
                  </button>
                </div>
              </div>

              {activeImageTab === 'url' ? (
                <div>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={formData.photoUrl || ''}
                      onChange={(e) => handleInputChange('photoUrl', e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors text-left"
                      dir="ltr"
                    />
                    <LinkIcon size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    أدخل رابط مباشر للصورة من الإنترنت، وسيتم تحديث المعاينة فوراً.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload size={15} className="text-blue-600" />
                    <span>اختر ملف صورة من جهازك (JPG, PNG, WebP)</span>
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    يتم تحويل الصورة وتخزينها محلياً على متصفحك لتبقى دائماً حتى بعد التحديث.
                  </p>
                </div>
              )}

              {imageError && (
                <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-medium bg-rose-50 p-2 rounded-lg">
                  <AlertCircle size={14} />
                  <span>تعذر تحميل رابط الصورة المدخل، يرجى التحقق من الرابط.</span>
                </div>
              )}
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم الكامل للمشرف
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="م. يوسف النجار"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors font-medium text-slate-900"
                />
                <User size={16} className="absolute right-3.5 top-3 text-slate-400" />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني المهني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="name@cardiovision.com"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors font-medium text-slate-900 text-left"
                  dir="ltr"
                />
                <Mail size={16} className="absolute right-3.5 top-3 text-slate-400" />
              </div>
            </div>

            {/* Role Field (Read-only / Protected) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  المنصب / الصلاحية بالنظام
                </label>
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                  <Lock size={10} />
                  <span>حقل محمي للقراءة فقط</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formData.role}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold cursor-not-allowed select-none"
                />
                <Shield size={16} className="absolute right-3.5 top-3 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                تُحدد الصلاحيات والمنصب تلقائياً من قبل الإدارة العامة للمشروع.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
              >
                <Check size={16} />
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
