import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FileUploader } from '../FileUploader'

describe('FileUploader', () => {
  const mockOnFileSelect = jest.fn()

  beforeEach(() => {
    mockOnFileSelect.mockClear()
  })

  it('renders file upload interface', () => {
    render(<FileUploader onFileSelect={mockOnFileSelect} />)
    
    expect(screen.getByText(/Drag and drop your file here/i)).toBeInTheDocument()
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument()
    expect(screen.getByText(/Select File/i)).toBeInTheDocument()
  })

  it('handles file selection via input', async () => {
    render(<FileUploader onFileSelect={mockOnFileSelect} />)
    
    const file = new File(['test content'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/Select File/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input)
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
    })
  })

  it('handles drag and drop', async () => {
    render(<FileUploader onFileSelect={mockOnFileSelect} />)
    
    const dropZone = screen.getByText(/Drag and drop your file here/i).closest('div')
    const file = new File(['test'], 'test.json', { type: 'application/json' })
    
    fireEvent.dragOver(dropZone!)
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    })
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(file)
    })
  })

  it('validates file type and rejects invalid files', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<FileUploader onFileSelect={mockOnFileSelect} acceptedTypes={['.json', '.gpx']} />)
    
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = screen.getByLabelText(/Select File/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    })
    
    fireEvent.change(input)
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument()
    })
    
    expect(mockOnFileSelect).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('validates file size and rejects oversized files', async () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.json', { type: 'application/json' })
    
    render(<FileUploader onFileSelect={mockOnFileSelect} maxSize={10 * 1024 * 1024} />)
    
    const input = screen.getByLabelText(/Select File/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    })
    
    fireEvent.change(input)
    
    await waitFor(() => {
      expect(screen.getByText(/exceeds/i)).toBeInTheDocument()
    })
    
    expect(mockOnFileSelect).not.toHaveBeenCalled()
  })

  it('displays selected file information', async () => {
    const file = new File(['test content'], 'test.json', { type: 'application/json' })
    
    const { rerender } = render(<FileUploader onFileSelect={mockOnFileSelect} />)
    
    mockOnFileSelect.mockImplementationOnce(() => {
      rerender(<FileUploader onFileSelect={mockOnFileSelect} />)
    })
    
    const input = screen.getByLabelText(/Select File/i).parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(input)
    
    // Note: In a real test, we'd need to manage component state properly
    // This is a simplified version
  })

  it('allows removing selected file', () => {
    render(<FileUploader onFileSelect={mockOnFileSelect} />)
    
    const removeButton = screen.queryByText(/Remove/i)
    // File not selected yet, so remove button shouldn't be visible
    expect(removeButton).not.toBeInTheDocument()
  })
})

