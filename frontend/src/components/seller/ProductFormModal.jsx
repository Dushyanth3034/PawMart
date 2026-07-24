import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, UploadCloud, Plus, Trash2, Loader2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function ProductFormModal({ isOpen, onClose, accessToken, onSuccess, initialData = null }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const isEditMode = !!initialData;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    sku: '',
    status: 'DRAFT',
    shortDescription: '',
    description: '',
    price: '',
    originalPrice: '',
    discountPercent: '',
    gst: '',
    currency: 'INR',
    inventoryStock: '',
    weight: '',
    packageDimensions: '',
    shippingCharges: '',
    isFreeShipping: false,
    estimatedDeliveryDays: '',
    petType: [],
    breedCompatibility: [],
    ageGroup: [],
    seoTitle: '',
    seoDescription: '',
    searchKeywords: []
  });

  // Images State
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ type: 'Color', value: '', price: '', stock: '', sku: '' });
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [breeds, setBreeds] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);

  React.useEffect(() => {
    if (isOpen) {
      axios.get(`${import.meta.env.VITE_API_URL}/categories`)
        .then(res => {
          setCategories(res.data.data || []);
          setCategoriesLoaded(true);
        })
        .catch(err => {
          console.error('Failed to fetch categories', err);
          setCategoriesLoaded(true);
        });

      axios.get(`${import.meta.env.VITE_API_URL}/categories/breeds`)
        .then(res => {
          setBreeds(res.data.data || []);
        })
        .catch(err => console.error('Failed to fetch breeds', err));

      axios.get(`${import.meta.env.VITE_API_URL}/categories/age-groups`)
        .then(res => {
          setAgeGroups(res.data.data || []);
        })
        .catch(err => console.error('Failed to fetch age groups', err));
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && initialData) {
      // Normalize array fields in case backend returns string, null, or undefined
      const normalizeArray = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(v => v.trim()).filter(Boolean);
        return [];
      };

      setFormData({
        name: initialData.name || '',
        brand: initialData.brand || '',
        categoryId: initialData.categoryId || '',
        sku: initialData.sku || '',
        status: initialData.status || 'DRAFT',
        shortDescription: initialData.shortDescription || '',
        description: initialData.description || '',
        price: initialData.price || '',
        originalPrice: initialData.originalPrice || '',
        discountPercent: initialData.discountPercent || '',
        gst: initialData.gst || '',
        currency: initialData.currency || 'INR',
        inventoryStock: initialData.inventory?.quantity || '',
        weight: initialData.weight || '',
        packageDimensions: initialData.packageDimensions || '',
        shippingCharges: initialData.shippingCharges || '',
        isFreeShipping: !!initialData.isFreeShipping,
        estimatedDeliveryDays: initialData.estimatedDeliveryDays || '',
        petType: normalizeArray(initialData.petType),
        breedCompatibility: normalizeArray(initialData.breedCompatibility),
        ageGroup: normalizeArray(initialData.ageGroup),
        seoTitle: initialData.seoTitle || '',
        seoDescription: initialData.seoDescription || '',
        searchKeywords: normalizeArray(initialData.searchKeywords)
      });

      if (initialData.images) {
        // Sort by order and extract urls
        const sortedImages = [...initialData.images].sort((a, b) => a.order - b.order);
        setImages(sortedImages.map(img => img.url));
      } else {
        setImages([]);
      }

      if (initialData.variants) {
        setVariants(initialData.variants);
      } else {
        setVariants([]);
      }
    } else if (isOpen && !initialData) {
      // Reset form on open for creation
      setFormData({
        name: '', brand: '', categoryId: '', sku: '', status: 'DRAFT', shortDescription: '', description: '',
        price: '', originalPrice: '', discountPercent: '', gst: '', currency: 'INR', inventoryStock: '', weight: '',
        packageDimensions: '', shippingCharges: '', isFreeShipping: false, estimatedDeliveryDays: '',
        petType: [], breedCompatibility: [], ageGroup: [], seoTitle: '', seoDescription: '', searchKeywords: []
      });
      setImages([]);
      setVariants([]);
      setActiveTab('basic');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayChange = (name, value) => {
    const array = value.split(',');
    setFormData(prev => ({ ...prev, [name]: array }));
  };

  const handleAddVariant = () => {
    if (!newVariant.value) return toast.error('Variant value is required');
    setVariants([...variants, { ...newVariant, id: Date.now() }]);
    setNewVariant({ type: 'Color', value: '', price: '', stock: '', sku: '' });
  };

  const handleRemoveVariant = (id) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      return toast.error('Maximum 8 images allowed');
    }

    const validFiles = files.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)) {
        toast.error(`${f.name} is not a valid image format`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 5MB`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    const payload = new FormData();
    validFiles.forEach(f => payload.append('images', f));

    try {
      setUploadingImages(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/seller/products/upload-images`, payload, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      setImages([...images, ...res.data.data]);
      toast.success('Images uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index) => {
    const newImages = [...images];
    const target = newImages.splice(index, 1)[0];
    newImages.unshift(target);
    setImages(newImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Detailed validation checks with specific notifications
    if (!formData.name) {
      return toast.error('Product Name is required.');
    }
    if (!formData.categoryId) {
      return toast.error('Category is required.');
    }
    if (formData.price === undefined || formData.price === null || formData.price === '') {
      return toast.error('Price is required.');
    }
    if (!images || images.length === 0) {
      return toast.error('Please upload at least one product image.');
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        petType: ['Dog'],
        breedCompatibility: Array.isArray(formData.breedCompatibility) ? formData.breedCompatibility : [],
        ageGroup: Array.isArray(formData.ageGroup) ? formData.ageGroup : [],
        searchKeywords: Array.isArray(formData.searchKeywords)
          ? formData.searchKeywords.map(i => i?.trim()).filter(Boolean)
          : [],
        images,
        variants: Array.isArray(variants) 
          ? variants.map(({ id, ...rest }) => rest)
          : []
      };

      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/seller/products/${initialData.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Product updated successfully!');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/seller/products`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Product added successfully.');
      }

      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'media', label: 'Media' },
    { id: 'pricing', label: 'Pricing & Inventory' },
    { id: 'variants', label: 'Variants' },
    { id: 'shipping', label: 'Shipping & Pets' },
    { id: 'seo', label: 'SEO' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07]">
          <h2 className="text-xl font-bold text-secondary">{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {categoriesLoaded && categories.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface/30 m-8 rounded-2xl border border-black/[0.07] text-center">
            <h3 className="text-xl font-bold text-secondary mb-2">No product categories are available.</h3>
            <p className="text-muted text-sm font-medium">Please create categories before adding products.</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-black/[0.07] bg-surface/50 overflow-y-auto">
            <div className="p-4 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    activeTab === tab.id 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-secondary hover:bg-black/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <form id="productForm" onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
              
              {/* BASIC INFO */}
              <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Basic Information</h3>
                <div className="space-y-5">
                  <MinimalInput label="Product Name *" name="name" value={formData.name} onChange={handleChange} />
                  <div className="grid grid-cols-2 gap-5">
                    <MinimalInput label="Brand" name="brand" value={formData.brand} onChange={handleChange} />
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Category *</label>
                      <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20">
                        <option value="">Select Category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <MinimalInput label="SKU (Leave empty to auto-generate)" name="sku" value={formData.sku} onChange={handleChange} />
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20">
                        <option value="ACTIVE">Active (Publish)</option>
                        <option value="DRAFT">Draft</option>
                        <option value="OUT_OF_STOCK">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Short Description</label>
                    <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary min-h-[80px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Full Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary min-h-[150px]" />
                  </div>
                </div>
              </div>

              {/* MEDIA */}
              <div className={activeTab === 'media' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Product Images</h3>
                
                <div className="mb-6">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/jpeg,image/png,image/webp,image/jpg" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <div 
                    onClick={() => !uploadingImages && images.length < 8 && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors
                      ${images.length >= 8 ? 'opacity-50 cursor-not-allowed border-black/10' : 'cursor-pointer hover:bg-primary/5 border-primary/30'}
                    `}
                  >
                    {uploadingImages ? (
                      <div className="flex flex-col items-center"><Loader2 className="animate-spin text-primary mb-2" size={32} /><span>Uploading...</span></div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="text-primary mb-3" size={36} />
                        <p className="font-bold text-secondary">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted mt-1">Up to 8 images (JPG, PNG, WEBP). Max 5MB each.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-black/[0.07]">
                      <img src={`${import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:5000'}${img}`} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md z-10">PRIMARY</div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {idx !== 0 && (
                          <button type="button" onClick={() => setPrimaryImage(idx)} className="p-2 bg-white rounded-full text-secondary hover:text-primary"><ImageIcon size={16} /></button>
                        )}
                        <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRICING & INVENTORY */}
              <div className={activeTab === 'pricing' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Pricing</h3>
                <div className="grid grid-cols-2 gap-5 mb-8">
                  <MinimalInput label="Selling Price *" name="price" type="number" value={formData.price} onChange={handleChange} />
                  <MinimalInput label="Original Price (MRP)" name="originalPrice" type="number" value={formData.originalPrice} onChange={handleChange} />
                  <MinimalInput label="Discount Percentage" name="discountPercent" type="number" value={formData.discountPercent} onChange={handleChange} />
                  <MinimalInput label="GST (%)" name="gst" type="number" value={formData.gst} onChange={handleChange} />
                </div>

                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Inventory</h3>
                <div className="grid grid-cols-2 gap-5">
                  <MinimalInput label="Total Stock Quantity" name="inventoryStock" type="number" value={formData.inventoryStock} onChange={handleChange} />
                </div>
              </div>

              {/* VARIANTS */}
              <div className={activeTab === 'variants' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Product Variants</h3>
                
                <div className="bg-surface p-5 rounded-xl border border-black/[0.07] mb-6">
                  <h4 className="font-bold text-sm text-secondary mb-4">Add Variant</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1 ml-1">Type</label>
                      <select className="w-full bg-white border border-black/[0.07] rounded-lg px-3 py-2 text-sm" value={newVariant.type} onChange={(e) => setNewVariant({...newVariant, type: e.target.value})}>
                        <option>Color</option><option>Size</option><option>Weight</option><option>Pack Size</option><option>Material</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1 ml-1">Value *</label>
                      <input type="text" className="w-full bg-white border border-black/[0.07] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Red" value={newVariant.value} onChange={(e) => setNewVariant({...newVariant, value: e.target.value})} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1 ml-1">Price Override</label>
                      <input type="number" className="w-full bg-white border border-black/[0.07] rounded-lg px-3 py-2 text-sm" placeholder="Optional" value={newVariant.price} onChange={(e) => setNewVariant({...newVariant, price: e.target.value})} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1 ml-1">Variant Stock</label>
                      <input type="number" className="w-full bg-white border border-black/[0.07] rounded-lg px-3 py-2 text-sm" placeholder="Optional" value={newVariant.stock} onChange={(e) => setNewVariant({...newVariant, stock: e.target.value})} />
                    </div>
                    <div className="md:col-span-1 pb-0.5">
                      <PremiumButton type="button" onClick={handleAddVariant} className="w-full !py-2 text-sm">Add</PremiumButton>
                    </div>
                  </div>
                </div>

                {variants.length > 0 && (
                  <div className="border border-black/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface border-b border-black/[0.07]">
                        <tr>
                          <th className="py-3 px-4 font-bold text-secondary">Type</th>
                          <th className="py-3 px-4 font-bold text-secondary">Value</th>
                          <th className="py-3 px-4 font-bold text-secondary">Price</th>
                          <th className="py-3 px-4 font-bold text-secondary">Stock</th>
                          <th className="py-3 px-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map(v => (
                          <tr key={v.id} className="border-b border-black/[0.07] last:border-0">
                            <td className="py-3 px-4 text-muted">{v.type}</td>
                            <td className="py-3 px-4 font-bold text-secondary">{v.value}</td>
                            <td className="py-3 px-4 text-muted">{v.price || '-'}</td>
                            <td className="py-3 px-4 text-muted">{v.stock || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              <button type="button" onClick={() => handleRemoveVariant(v.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SHIPPING & PETS */}
              <div className={activeTab === 'shipping' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-5 mb-8">
                  <MinimalInput label="Weight (kg)" name="weight" type="number" value={formData.weight} onChange={handleChange} />
                  <MinimalInput label="Package Dimensions (LxWxH)" name="packageDimensions" value={formData.packageDimensions} onChange={handleChange} placeholder="e.g. 10x10x10 cm" />
                  <MinimalInput label="Shipping Charges" name="shippingCharges" type="number" value={formData.shippingCharges} onChange={handleChange} />
                  <MinimalInput label="Est. Delivery Days" name="estimatedDeliveryDays" type="number" value={formData.estimatedDeliveryDays} onChange={handleChange} />
                  
                  <div className="col-span-2 flex items-center gap-3">
                    <input type="checkbox" name="isFreeShipping" checked={formData.isFreeShipping} onChange={handleChange} className="w-5 h-5 rounded-[6px] border-black/[0.07] text-primary focus:ring-primary accent-primary" id="freeShip" />
                    <label htmlFor="freeShip" className="text-sm font-bold text-secondary cursor-pointer">Offer Free Shipping</label>
                  </div>
                </div>

                 <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Pet Compatibility</h3>
                 <div className="space-y-6">
                   <div>
                     <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Dog Breed Compatibility</label>
                     <div className="w-full bg-surface border border-black/[0.07] rounded-xl p-4 max-h-[160px] overflow-y-auto grid grid-cols-2 gap-2">
                       {breeds.map(b => (
                         <label key={b.id} className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer">
                           <input
                             type="checkbox"
                             checked={formData.breedCompatibility.includes(b.id)}
                             onChange={(e) => {
                               const checked = e.target.checked;
                               setFormData(prev => ({
                                 ...prev,
                                 breedCompatibility: checked
                                   ? [...prev.breedCompatibility, b.id]
                                   : prev.breedCompatibility.filter(id => id !== b.id)
                               }));
                             }}
                             className="w-4 h-4 rounded border-black/[0.07] text-primary focus:ring-primary accent-primary"
                           />
                           {b.name}
                         </label>
                       ))}
                     </div>
                   </div>

                   <div>
                     <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Dog Age Group Compatibility</label>
                     <div className="w-full bg-surface border border-black/[0.07] rounded-xl p-4 grid grid-cols-3 gap-2">
                       {ageGroups.map(ag => (
                         <label key={ag.id} className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer">
                           <input
                             type="checkbox"
                             checked={formData.ageGroup.includes(ag.id)}
                             onChange={(e) => {
                               const checked = e.target.checked;
                               setFormData(prev => ({
                                 ...prev,
                                 ageGroup: checked
                                   ? [...prev.ageGroup, ag.id]
                                   : prev.ageGroup.filter(id => id !== ag.id)
                               }));
                             }}
                             className="w-4 h-4 rounded border-black/[0.07] text-primary focus:ring-primary accent-primary"
                           />
                           {ag.name}
                         </label>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>

              {/* SEO */}
              <div className={activeTab === 'seo' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-black/[0.07] pb-2">Search Engine Optimization</h3>
                <div className="space-y-5">
                  <MinimalInput label="SEO Title" name="seoTitle" value={formData.seoTitle} onChange={handleChange} />
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">SEO Description</label>
                    <textarea name="seoDescription" value={formData.seoDescription} onChange={handleChange} className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary min-h-[100px]" />
                  </div>
                  <MinimalInput label="Search Keywords (comma separated)" value={Array.isArray(formData.searchKeywords) ? formData.searchKeywords.join(',') : ''} onChange={(e) => handleArrayChange('searchKeywords', e.target.value)} placeholder="toy, rubber, dog" />
                </div>
              </div>

            </form>
          </div>
          </div>
        )}

        {categoriesLoaded && categories.length > 0 && (
          <div className="border-t border-black/[0.07] px-6 py-4 flex items-center justify-between bg-surface/30">
            <div className="text-sm font-bold text-muted">
              {images.length}/8 Images Uploaded
            </div>
            <div className="flex gap-3">
              <PremiumButton type="button" onClick={onClose} variant="ghost" className="!px-6">Cancel</PremiumButton>
              <PremiumButton onClick={handleSubmit} disabled={loading} className="!px-8">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Product'}
              </PremiumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
