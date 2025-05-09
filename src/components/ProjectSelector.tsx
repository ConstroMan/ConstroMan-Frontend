import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getAllAccessibleProjects, addProject, deleteProject } from '../services/api';
import { ChevronLeft, Loader2, Sun, Moon, LayoutGrid, List, PlusCircle, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, themes } from '../utils/theme';
import { Dialog } from './ui/Dialog'
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { NavBar } from './NavBar';

interface Project {
  id: string;
  name: string;
}

interface NewProject {
  name: string;
  files: FileList | null;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newProject, setNewProject] = useState<NewProject>({
    name: '',
    files: null
  });
  const [userType, setUserType] = useState<'company' | 'employee'>('employee');
  
  // Separate loading states for different operations
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [isSelectingProject, setIsSelectingProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false)
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const storedUserType = localStorage.getItem('userType') as 'company' | 'employee' | null;
    if (storedUserType) {
      setUserType(storedUserType);
    }
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsFetchingProjects(true);
      const fetchedProjects = await getAllAccessibleProjects();
      setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
      
      console.log('Fetched projects:', fetchedProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      showToast(
        error.message || 'Failed to fetch projects',
        'error'
      );
      setProjects([]);
    } finally {
      setIsFetchingProjects(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    try {
      setIsSelectingProject(true);
      setSelectedProject(projectId);
      showToast('Project selected successfully', 'success');
      navigate(`/project/${projectId}`);
    } catch (error: any) {
      showToast(
        error.message || 'Failed to select project',
        'error'
      );
    } finally {
      setIsSelectingProject(false);
    }
  };

  const handleNewProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingProject(true)
    try {
      await addProject({
        name: newProject.name,
        files: newProject.files
      })

      setIsAddProjectDialogOpen(false)
      await fetchProjects()
      setNewProject({
        name: '',
        files: null
      })
    } catch (error) {
      console.error('Error adding new project:', error)
      setError(error.response?.data?.message || 'Failed to add new project. Please try again.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      setIsDeletingProject(true);
      await deleteProject(Number(projectToDelete.id));
      showToast('Project deleted successfully', 'success');
      await fetchProjects();
    } catch (error: any) {
      showToast(
        error.message || 'Failed to delete project',
        'error'
      );
    } finally {
      setIsDeletingProject(false);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects?.filter(project => 
    project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AnimatePresence>
      <motion.div 
        className={`min-h-screen flex items-center justify-center ${themeStyles.background}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ 
          backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        <div className="fixed top-4 left-0 w-72">
          <img 
            src={currentTheme === 'dark' 
              ? '/images/Logo_Full_Dark_Mode-removebg-preview.png'
              : '/images/Logo_Full_Light_mode-removebg-preview.png'
            } 
            alt="ConstroMan Logo" 
            className="w-full h-auto"
          />
        </div>

        <motion.div 
          className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
              className={`w-10 h-10 rounded-full ${themeStyles.cardBg} shadow-lg flex items-center justify-center`}
            >
              <motion.div
                initial={false}
                animate={{
                  rotate: currentTheme === 'light' ? 0 : 180,
                  scale: currentTheme === 'light' ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="absolute"
              >
                <Sun className={themeStyles.subtext} />
              </motion.div>
              <motion.div
                initial={false}
                animate={{
                  rotate: currentTheme === 'light' ? -180 : 0,
                  scale: currentTheme === 'light' ? 0 : 1
                }}
                transition={{ duration: 0.3 }}
                className="absolute"
              >
                <Moon className={themeStyles.subtext} />
              </motion.div>
            </button>
          </div>

          <div className="space-y-6">
            <h2 className={`text-center text-3xl font-extrabold ${themeStyles.text}`}>
              Select a Project
            </h2>
            <p className={`text-center text-sm ${themeStyles.subtext}`}>
              Choose a project to view details or add a new one
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Input
                type="search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 mr-4 ${themeStyles.inputBg}`}
              />
              
              <div className={`flex rounded-lg ${themeStyles.cardBg} p-1`}>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list' 
                      ? `${themeStyles.buttonBg} ${themeStyles.buttonText}` 
                      : themeStyles.subtext
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid' 
                      ? `${themeStyles.buttonBg} ${themeStyles.buttonText}` 
                      : themeStyles.subtext
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {userType === 'company' && (
            <Button
              onClick={() => setIsAddProjectDialogOpen(true)}
              className={`
                w-full
                rounded-xl
                ${themeStyles.buttonBg} 
                ${themeStyles.buttonText} 
                ${themeStyles.buttonHoverBg}
                transition-all duration-200
                hover:scale-102
                hover:shadow-md
                active:scale-98
                flex items-center justify-center
                p-4
                border-2 border-dashed
              `}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span className="text-center">Add a New Project</span>
            </Button>
          )}

          {error && <p className="text-red-500 text-center">{error}</p>}

          <div className="space-y-6">
            {isFetchingProjects ? (
              <div className={`flex items-center justify-center py-8 ${themeStyles.subtext}`}>
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading projects...</span>
              </div>
            ) : (
              <div className={`
                ${viewMode === 'grid' 
                  ? 'grid grid-cols-2 gap-3'
                  : 'space-y-3'
                }
                max-h-[300px] overflow-y-auto pr-2
              `}
              >
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <Button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className={`
                        ${viewMode === 'grid' 
                          ? `h-28 flex-col justify-start p-4 rounded-xl text-left`
                          : `w-full rounded-full`
                        }
                        ${themeStyles.buttonBg} 
                        ${themeStyles.buttonText} 
                        ${themeStyles.buttonHoverBg}
                        transition-all duration-200
                        hover:scale-102
                        hover:shadow-md
                        active:scale-98
                        flex items-start
                        relative
                      `}
                    >
                      {viewMode === 'grid' ? (
                        <>
                          <h3 className="text-base font-semibold mb-1">{project.name}</h3>
                          <p className={`text-xs ${themeStyles.subtext}`}>Click to view details</p>
                          {userType === 'company' && (
                            <button
                              onClick={(e) => handleDeleteProject(e, project)}
                              className="absolute top-2 right-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span>{project.name}</span>
                          {userType === 'company' && (
                            <button
                              onClick={(e) => handleDeleteProject(e, project)}
                              className="absolute right-4 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </>
                      )}
                    </Button>
                  ))
                ) : (
                  <div className={`text-center ${themeStyles.subtext} py-4`}>
                    No projects found
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Add Project Dialog */}
        <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
          <Dialog.Content className={`${themeStyles.cardBg} border ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-2xl shadow-lg max-w-md mx-auto`}>
            <Dialog.Header className="pb-2">
              <Dialog.Title className={`${themeStyles.text} text-xl font-semibold`}>
                Add New Project
              </Dialog.Title>
              <Dialog.Description className={`${themeStyles.subtext} text-sm`}>
                Create a new project and upload related files.
              </Dialog.Description>
            </Dialog.Header>

            <form onSubmit={handleNewProjectSubmit}>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${themeStyles.text}`}>
                    Project Name
                  </label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                    className={`w-full ${themeStyles.inputBg} ${themeStyles.text} border-${currentTheme === 'dark' ? 'gray-700' : 'gray-200'} rounded-xl px-4 py-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium ${themeStyles.text}`}>
                    Project Files
                  </label>
                  <div className={`${themeStyles.inputBg} rounded-xl p-4 border ${currentTheme === 'dark' ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'} transition-colors duration-200`}>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setNewProject({ ...newProject, files: e.target.files || null })}
                      className={`w-full text-sm ${themeStyles.subtext} 
                        file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                        file:text-sm file:font-semibold 
                        ${currentTheme === 'dark' 
                          ? 'file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600' 
                          : 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
                        } 
                        transition-colors duration-200`}
                    />
                  </div>
                  <p className={`text-xs ${themeStyles.subtext} mt-1 ml-1`}>Select one or more files to upload</p>
                </div>
              </div>

              <Dialog.Footer className="flex justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddProjectDialogOpen(false)}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${currentTheme === 'dark' 
                    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700' 
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'}`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingProject || !newProject.name.trim()}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} ${(!newProject.name.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                >
                  {isCreatingProject ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog>

        {/* Add Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Dialog.Content className={`${themeStyles.cardBg} border ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-2xl shadow-lg max-w-md mx-auto`}>
            <Dialog.Header className="pb-2">
              <Dialog.Title className={`${themeStyles.text} text-xl font-semibold`}>
                Delete Project
              </Dialog.Title>
              <Dialog.Description className={`${themeStyles.subtext} text-sm`}>
                Are you sure you want to delete <span className="font-medium">"{projectToDelete?.name}"</span>? This action cannot be undone.
              </Dialog.Description>
            </Dialog.Header>

            <div className={`my-4 p-4 rounded-xl ${currentTheme === 'dark' ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-600'}`}>
              <p className="text-sm">
                All project data and associated files will be permanently removed.
              </p>
            </div>

            <Dialog.Footer className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${currentTheme === 'dark' 
                  ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700' 
                  : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'}`}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteProject}
                disabled={isDeletingProject}
                className="px-4 py-2 rounded-xl transition-all duration-200 bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
              >
                {isDeletingProject ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>

        {/* Loading Overlay - Only show when creating a project */}
        {isCreatingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`${themeStyles.cardBg} p-8 rounded-3xl shadow-xl max-w-sm w-full mx-4 border ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col items-center space-y-6">
                <div className="p-4 bg-blue-500 bg-opacity-10 rounded-full">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className={`font-semibold text-xl ${themeStyles.text}`}>
                    Creating your project...
                  </p>
                  <p className={`text-sm ${themeStyles.subtext}`}>
                    This may take a moment
                  </p>
                </div>
                
                <div className={`w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2`}>
                  <div className={`h-full bg-blue-500 rounded-full animate-pulse`} style={{ width: '60%' }}></div>
                </div>
                
                <p className={`text-xs ${themeStyles.subtext} italic`}>
                  Your files are being processed and organized
                </p>
              </div>
            </div>
          </div>
        )}

        <NavBar />
      </motion.div>
    </AnimatePresence>
  );
}
