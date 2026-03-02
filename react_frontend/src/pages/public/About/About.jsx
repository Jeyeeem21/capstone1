import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Eye, 
  Heart, 
  Award,
  Users,
  Truck,
  Shield,
  Leaf,
  CheckCircle,
  ArrowRight,
  MapPin,
  Calendar
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { websiteContentApi } from '../../../api';

// Icon mapping for values
const iconMap = {
  'Quality First': Shield,
  'Customer Care': Heart,
  'Sustainability': Leaf,
  'Excellence': Award,
};

// Default content fallback
const defaultContent = {
  heroTitle: 'Our Story of',
  heroTitleHighlight: 'Excellence & Quality',
  heroSubtitle: 'For over 15 years, KJP Ricemill has been committed to delivering the finest quality rice products to Filipino households and businesses.',
  missionTitle: 'Our Mission',
  missionDescription: 'To provide Filipino families and businesses with the highest quality rice products at fair prices, while supporting local farmers and sustainable agricultural practices.',
  missionPoints: [
    'Deliver premium quality rice consistently',
    'Support local farming communities',
    'Ensure fair and competitive pricing',
    'Provide exceptional customer service',
  ],
  visionTitle: 'Our Vision',
  visionDescription: 'To become the most trusted and preferred rice supplier in the Philippines, known for our unwavering commitment to quality, innovation, and customer satisfaction.',
  visionPoints: [
    'Be the leading rice supplier in the region',
    'Pioneer innovative milling technologies',
    'Create lasting value for all stakeholders',
    'Promote sustainable rice production',
  ],
  values: [
    { title: 'Quality First', description: 'We never compromise on the quality of our rice products, ensuring every grain meets our high standards.' },
    { title: 'Customer Care', description: 'Building lasting relationships with our customers through exceptional service and reliability.' },
    { title: 'Sustainability', description: 'Supporting local farmers and implementing eco-friendly practices in our operations.' },
    { title: 'Excellence', description: 'Striving for excellence in everything we do, from sourcing to delivery.' },
  ],
  timeline: [
    { year: '2010', title: 'Foundation', description: 'KJP Ricemill was established with a small milling facility and a vision for quality.' },
    { year: '2014', title: 'Expansion', description: 'Expanded operations with modern milling equipment and increased storage capacity.' },
    { year: '2018', title: 'Growth', description: 'Reached 100+ regular customers and established partnerships with local farmers.' },
    { year: '2022', title: 'Innovation', description: 'Implemented digital inventory system and launched online ordering platform.' },
    { year: '2024', title: 'Present', description: 'Serving 500+ customers with a diverse range of premium rice products.' },
  ],
  team: [
    { name: 'Jose P. Katipunan', role: 'Founder & CEO' },
    { name: 'Maria Santos', role: 'Operations Manager' },
    { name: 'Pedro Garcia', role: 'Quality Control Head' },
    { name: 'Ana Reyes', role: 'Sales Manager' },
  ],
};

// Default team images
const teamImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop',
];

// Get initial content from localStorage/window (preloaded in index.html)
const getInitialAboutContent = () => {
  if (window.__ABOUT_CONTENT__) return { ...defaultContent, ...window.__ABOUT_CONTENT__ };
  try {
    const saved = localStorage.getItem('kjp-about-content');
    if (saved) return { ...defaultContent, ...JSON.parse(saved) };
  } catch (e) {}
  return defaultContent;
};

const About = () => {
  // Initialize with cached data immediately - no flash!
  const [content, setContent] = useState(getInitialAboutContent);
  const [loading, setLoading] = useState(() => !window.__ABOUT_CONTENT__);

  // Sync with API in background
  useEffect(() => {
    const syncContent = async () => {
      try {
        const result = await websiteContentApi.getAboutContent();
        if (result.success && result.data) {
          const newContent = { ...defaultContent, ...result.data };
          setContent(newContent);
          localStorage.setItem('kjp-about-content', JSON.stringify(result.data));
        }
      } catch (error) {
        console.log('Using cached content');
      }
      setLoading(false);
    };
    syncContent();
  }, []);

  // Map values with icons
  const values = (content.values || defaultContent.values).map(v => ({
    ...v,
    icon: iconMap[v.title] || Shield,
  }));

  const timeline = content.timeline || defaultContent.timeline;
  
  // Map team with images
  const team = (content.team || defaultContent.team).map((member, index) => ({
    ...member,
    image: teamImages[index % teamImages.length],
  }));

  const stats = [];

  // Default hero image if none set
  const heroImage = content.heroImage || 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=1920&h=800&fit=crop';

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ 
            backgroundImage: `url(${heroImage})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1 bg-button-500/20 border border-button-500/30 text-button-300 rounded-full text-sm font-medium mb-6">
            About KJP Ricemill
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            {content.heroTitle}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-button-400 to-primary-400">
              {content.heroTitleHighlight}
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="bg-gradient-to-br from-button-50 to-primary-50 rounded-xl p-10 shadow-lg shadow-primary-100/50 border-2 border-primary-300">
              <div className="w-16 h-16 bg-gradient-to-br from-button-500 to-button-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-button-500/25">
                <Target size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{content.missionTitle}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {content.missionDescription}
              </p>
              <ul className="space-y-3">
                {(content.missionPoints || defaultContent.missionPoints).map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle size={18} className="text-button-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vision */}
            <div className="bg-gradient-to-br from-primary-50 to-button-50 rounded-xl p-10 shadow-lg shadow-primary-100/50 border-2 border-primary-300">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/25">
                <Eye size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{content.visionTitle}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {content.visionDescription}
              </p>
              <ul className="space-y-3">
                {(content.visionPoints || defaultContent.visionPoints).map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle size={18} className="text-primary-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-button-700 to-button-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon size={28} className="text-white" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-24 bg-gradient-to-b from-white to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-button-100 text-button-700 rounded-full text-sm font-medium mb-4">
              Our Values
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              What We Stand For
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our core values guide everything we do, from how we source our rice to how we serve our customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div 
                key={value.title}
                className="group bg-white rounded-xl p-8 shadow-lg shadow-primary-100/50 hover:shadow-xl transition-all duration-300 border-2 border-primary-300 hover:border-button-400 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-button-500 to-button-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-button-500/25">
                  <value.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-button-100 text-button-700 rounded-full text-sm font-medium mb-4">
              Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              A Legacy of Quality
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From humble beginnings to becoming a trusted name in the rice industry
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-button-200" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={item.year} className={`relative flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  {/* Content */}
                  <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <div className="bg-gradient-to-br from-primary-50 to-button-50 rounded-xl p-6 shadow-lg shadow-primary-100/50 border-2 border-primary-300 hover:border-button-400 transition-colors">
                      <span className="inline-block px-3 py-1 bg-button-500 text-white text-sm font-bold rounded-full mb-3">
                        {item.year}
                      </span>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>

                  {/* Timeline Dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-button-500 rounded-full border-4 border-white shadow-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-button-100 text-button-700 rounded-full text-sm font-medium mb-4">
              Our Team
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              Meet the People Behind KJP
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A dedicated team committed to bringing you the best quality rice products
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member) => (
              <div 
                key={member.name}
                className="group bg-white rounded-xl overflow-hidden shadow-lg shadow-primary-100/50 hover:shadow-xl transition-all duration-300 border-2 border-primary-300 hover:border-button-400"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                </div>
                <div className="p-6 text-center -mt-16 relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-button-500 to-button-700 rounded-full mx-auto mb-4 border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{member.name}</h3>
                  <p className="text-sm text-button-600">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-button-700 via-button-600 to-button-700 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Experience the KJP Difference?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who trust KJP Ricemill for their rice needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="px-8 bg-white !text-button-700 hover:bg-gray-100 group">
                Get in Touch
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg" className="px-8 border-white/30 text-white hover:bg-white/10">
                View Products
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
